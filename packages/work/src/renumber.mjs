import path from 'node:path';
import { readFile, readdir, rename, writeFile, lstat, realpath } from 'node:fs/promises';
import { listItems, isLiveStreamRow } from './discovery.mjs';
import { recordDoc, parseFrontmatter } from './records.mjs';
import { rewriteDependsEntries, rewriteRefEntry } from './dependencies.mjs';
import { FEEDBACK_RECORD_FILE } from './feedback-records.mjs';
import { commandError } from '@aof/contracts/error';

const escape = text => text.replace(/[.*+?^$()|[\]\\]/g, '\\$&');
const slash = text => text.replaceAll('\\', '/');
const inside = (base, file) => { const rel=path.relative(base,file); return rel==='' || (!rel.startsWith('..')&&!path.isAbsolute(rel)); };
const normal = ref => String(ref).split('/').map(n=>String(Number(n))).join('/');
const evidenceDirs = new Set(['runs', 'observability', 'verification', '.git', 'node_modules']);

async function documents(dir) {
  const found=[];
  for (const entry of await readdir(dir,{withFileTypes:true})) {
    if (entry.isSymbolicLink()) continue;
    const file=path.join(dir,entry.name);
    if (entry.isDirectory() && !evidenceDirs.has(entry.name)) found.push(...await documents(file));
    else if (entry.isFile() && (/\.(?:md|feature)$/u.test(entry.name) || entry.name===FEEDBACK_RECORD_FILE)) found.push(file);
  }
  return found;
}

function rewriteCurrent(text, {item, remap, oldName, newName, moved}) {
  let next=text.replace(new RegExp('(?<![\\w-])'+escape(oldName)+'(?![\\w-])','gu'),newName);
  // Qualified citations and nested refs, never an unqualified number in arbitrary prose.
  const mapping=new Map(remap.map(pair=>[pair.from,pair.to]));
  const alternatives=[...mapping.keys()].sort((a,b)=>b.length-a.length).map(escape).join('|');
  next=next.replace(new RegExp('(?<![\\w/])([mM]?)('+alternatives+')(?=/[A-Za-z0-9]|(?=[\\s'+'\x60'+']|$))','gu'),(whole,prefix,ref,offset)=>{
    // A bare ref is changed only in a moved document heading. Qualified refs are unambiguous.
    const end=offset+whole.length;
    return next[end]==='/' || ref.includes('/') ? prefix+mapping.get(ref) : whole;
  });
  if (moved) {
    const headings = item.parent==null ? remap : [...remap,{from:item.number,to:remap[0].to.split('/').at(-1)}];
    for (const {from,to} of headings) next=next.replace(new RegExp('^(#{1,6}[ \\t]+)'+escape(from)+'(?=[ \\t]+[·:—-])','gm'),'$1'+to);
  }
  if (item.parent==null) {
    const map = raw => /^\d+$/u.test(raw) && normal(raw)===normal(item.ref) ? remap[0].to : null;
    next = rewriteDependsEntries(next,map);
    next = next.replace(/^(---\r?\n)([\s\S]*?)(\r?\n---)/u,(all,open,fm,close)=> {
      if (/^depends:[ \t]*\r?\n[ \t]+-/m.test(fm)) throw commandError('Block-list depends is not supported by the work grammar; use an inline list before renumbering.','renumber-depends-unsupported',409);
      return open+fm.replace(/^(depends:[ \t]*)([^\r\n]*)$/m,(whole,prefix,value)=>value.trim().startsWith('[')?whole:prefix+rewriteRefEntry(value,map).text)+close;
    });
  }
  return next;
}

// A recall ledger names lessons by `<item>/<id>`, so the moved refs are rewritten where they are
// stored rather than remembered in a side file: each recall's `scope.item` and each record's `item`.
// Only a changed line is re-serialised; every other line keeps its bytes.
function rewriteLedger(text, remap) {
  const mapping=new Map(remap.map(pair=>[normal(pair.from),pair.to]));
  const moved=ref=>typeof ref==='string'&&/^\d+(?:\/\d+)?$/u.test(ref)?mapping.get(normal(ref)):undefined;
  return text.split('\n').map(line=>{
    let row;
    try { row=JSON.parse(line); } catch { return line; }
    if (row?.kind!=='recall') return line;
    let changed=false;
    const at=(holder,key)=>{ const to=moved(holder?.[key]); if(to!==undefined){ holder[key]=to; changed=true; } };
    if (row.scope&&typeof row.scope==='object') at(row.scope,'item');
    for (const record of Array.isArray(row.records)?row.records:[]) at(record,'item');
    return changed?JSON.stringify(row):line;
  }).join('\n');
}

export async function planRenumber(workDir, {ref,to}={}) {
  if (typeof ref!=='string'||!/^\d+(?:\/\d+)?$/u.test(ref)) throw commandError('Renumber requires an exact numbered ref.','renumber-invalid-ref',400);
  if (typeof to!=='string'||!/^\d+$/u.test(to)||!Number.isSafeInteger(Number(to))) throw commandError('The target number must be a non-negative safe integer.','renumber-invalid-target',400);
  const items=await listItems(workDir);
  const matches=items.filter(row=>row.number!=null&&normal(row.ref)===normal(ref));
  if (matches.length!==1) throw commandError('Renumber requires exactly one existing item: '+ref,'renumber-ref-not-found',404);
  const item=matches[0];
  if (!isLiveStreamRow(item)) throw commandError('Archived work cannot be renumbered.','renumber-not-live',409);
  if (Number(item.number)===Number(to)) throw commandError('Choose a different number.','renumber-same-number',409);
  const sameSpace=row=>item.parent==null?row.parent==null:row.parent!=null&&Number(row.parent)===Number(item.parent);
  if (items.some(row=>row.number!=null&&sameSpace(row)&&Number(row.number)===Number(to))) throw commandError('Target number '+to+' is occupied; renumber never shifts another item.','renumber-target-occupied',409);
  const number=String(Number(to)).padStart(item.number.length,'0');
  const newRef=item.parent==null?number:item.parent+'/'+number;
  const oldName=path.basename(item.dir), newName=number+'_'+item.type+'_'+item.slug;
  const destination=path.join(path.dirname(item.dir),newName);
  const realRoot=await realpath(workDir);
  if (!inside(realRoot,await realpath(item.dir))||(await lstat(item.dir)).isSymbolicLink()) throw commandError('Renumber source must be inside the work directory.','renumber-outside-work',409);
  try { await lstat(destination); throw commandError('Destination already exists.','renumber-target-occupied',409); }
  catch(error) { if(error.code!=='ENOENT') throw error; }
  const doc=recordDoc(item);
  if (!doc) throw commandError('Item has no identity document.','renumber-record-unusable',409);
  const record=path.join(item.dir,doc);
  if ((await lstat(record)).isSymbolicLink()) throw commandError('Identity document must not be a symlink.','renumber-record-unusable',409);
  const original=await readFile(record,'utf8');
  const meta=parseFrontmatter(original);
  if (meta.number==null||Number(meta.number)!==Number(item.number)||!/^---\r?\n[\s\S]*?^number:[^\r\n]+/m.test(original)) throw commandError('Identity document number is missing or disagrees with its folder.','renumber-record-unusable',409);
  const remap=[{from:item.ref,to:newRef}];
  if(item.parent==null) for(const child of items.filter(row=>row.parent!=null&&Number(row.parent)===Number(item.number))) remap.push({from:child.ref,to:number+'/'+child.number});
  const changes=[];
  for(const file of await documents(workDir)) {
    const before=await readFile(file,'utf8');
    const moved=inside(item.dir,file);
    let after=path.basename(file)===FEEDBACK_RECORD_FILE ? rewriteLedger(before,remap) : rewriteCurrent(before,{item,remap,oldName,newName,moved});
    if(file===record) after=after.replace(/^(---\r?\n)([\s\S]*?)(\r?\n---)/u,(all,open,fm,close)=>open+fm.replace(/^(number:[ \t]*).*$/m,'$1'+number)+close);
    if(item.parent==null) after=after.replace(/^(---\r?\n)([\s\S]*?)(\r?\n---)/u,(all,open,fm,close)=>open+fm.replace(/^(parent:[ \t]*)(.*)$/m,(whole,prefix,value)=>prefix+rewriteRefEntry(value,raw=>/^\d+$/u.test(raw)&&normal(raw)===normal(item.ref)?number:null).text)+close);
    if(before!==after) changes.push({file,target:moved?path.join(destination,path.relative(item.dir,file)):file,before,after});
  }
  return {from:item.ref,to:newRef,source:item.dir,destination,remap,changes,
    touched:[...new Set([...remap.flatMap(pair=>[pair.from,pair.to]),...(item.parent==null?[]:[item.parent])])],
    rewritten:changes.map(change=>slash(path.relative(workDir,change.target)))};
}

export function describeRenumber(plan) {
  return {from:plan.from,to:plan.to,source:plan.source,destination:plan.destination,remap:plan.remap,rewritten:plan.rewritten};
}

export async function applyRenumber(plan, { write = writeFile } = {}) {
  // A plan is optimistic: refuse stale source bytes before the first mutation.
  for(const change of plan.changes) if(await readFile(change.file,'utf8')!==change.before) throw commandError('Work changed after the renumber preview; retry.','renumber-plan-stale',409);
  try { await lstat(plan.destination); throw commandError('Destination appeared after planning.','renumber-target-occupied',409); }
  catch(error) { if(error.code!=='ENOENT') throw error; }
  await rename(plan.source,plan.destination);
  const written=[];
  try {
    for(const change of plan.changes) { written.push(change); await write(change.target,change.after,'utf8'); }
  } catch(error) {
    // Preserve rollback errors rather than claiming the original state was recovered.
    try {
      for(const change of written.reverse()) await write(change.target,change.before,'utf8');
      await rename(plan.destination,plan.source);
    } catch(rollback) { throw commandError('Renumber failed and rollback needs repair: '+error.message+'; '+rollback.message,'renumber-rollback-failed',500); }
    throw error;
  }
  return describeRenumber(plan);
}
