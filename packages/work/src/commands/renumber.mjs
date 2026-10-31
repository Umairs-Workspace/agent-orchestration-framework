export function createRenumberCommand({ transitionStreamRenumbered, refreshMemory }) {
  const renumberCommand = {
    id: 'work:renumber',
    input: {type:'object', properties:{ref:{type:'string'},to:{type:'string'},dryRun:{type:'boolean'}},required:['ref','to'],additionalProperties:false},
    async run(input, ctx) {
      const result=await transitionStreamRenumbered(ctx.workspace,input,{publisherOptions:ctx,journalOptions:ctx.effectsJournalOptions??{}});
      if (!result.moved) return result;
      try { return {...result,memory:{ok:true,result:await refreshMemory(ctx)}}; }
      catch(error) { return {...result,memory:{ok:false,message:error.message,recovery:'aof work memory ingest'}}; }
    },
    cli: {
      route:['work','renumber'],
      spec:{usage:'aof work renumber <ref> --to <number> [--dry-run] [--json]', flags:{
        to:{type:'string',description:'vacant number in the same number space; other items do not shift'},
        dryRun:{type:'boolean',description:'preview the remap and document edits without writing or refreshing memory'},
      }},
      argv:(positionals,options)=>({ref:positionals[0]??'',to:options.to??'',dryRun:options.dryRun===true}),
      json:out=>out,
      render:out=>(out.dryRun
        ? 'Would renumber '+out.from+' → '+out.to+'; '+out.rewritten.length+' document(s) would change.'
        : 'Renumbered '+out.from+' → '+out.to+'; '+out.rewritten.length+' document(s) changed. '+(out.memory.ok?'Memory refreshed.':'Memory refresh failed: '+out.memory.message+'. Run '+out.memory.recovery+'.')) + (out.effects?.some(effect=>effect.status==='failed') ? '\nStream effects failed: '+out.effects.filter(effect=>effect.status==='failed').map(effect=>effect.key+': '+effect.error).join('; ')+'. Inspect the effects journal before resuming work.' : '') + (out.effects?.some(effect=>effect.status==='deferred') ? '\nQueued for the designated worker: '+out.effects.filter(effect=>effect.status==='deferred').map(effect=>effect.key).join(', ')+'.' : ''),
      exit:out=>out.memory?.ok===false || out.effects?.some(effect=>effect.outcome==='failed'||effect.status==='failed'||effect.ok===false)?1:0,
    },
  };
  return {renumberCommand};
}
