import assert from 'node:assert/strict';
import test from 'node:test';
import {createGradeCommand} from '@aof/work/commands/grade';

test('grade composes execution and provenance ports without running its bare read face',async()=>{
  const calls=[];
  const api=createGradeCommand({
    resolveItem:async(ctx,ref)=>({ref,dir:ctx.workspace.projectRoot}),requireLocalCheckout:()=>{},readRuns:async()=>[],
    deriveNodeId:async()=>{calls.push('node');return 'fixture-node';},headCommit:async()=>{calls.push('head');return 'abc123';},
    spawnRubricAsync:async(...args)=>{calls.push(args);return {status:0,stdout:'TAP version 13\nok 1 - fixture\n1..1\n',stderr:'',error:null,signal:null};},
  });
  const ctx={workspace:{projectRoot:process.cwd(),config:{work:{
    rubric:{command:['fixture-runner','literal;arg'],report:{format:'tap',floor:1}},
    loop:{startToCloseMs:4000,heartbeatMs:2000},
  }}}};
  const input={ref:'01',now:'2026-09-29T12:00:00.000Z',env:{PATH:'fixture'}};
  const read=await api.gradeCommand.run(input,ctx);assert.equal(read.launched,0);assert.deepEqual(calls,[]);
  const result=await api.gradeCommand.run({...input,run:true},ctx);
  assert.equal(result.launched,1);assert.equal(result.grade.verdict,'pass');
  assert.deepEqual(calls.slice(0,2),['node','head']);assert.equal(calls.length,3);
  const [program,args,options]=calls[2];assert.equal(program,'fixture-runner');assert.deepEqual(args,['literal;arg']);
  assert.equal(options.timeout,2000);assert.equal(options.shell,false);assert.equal(options.env.AOF_GRADE_RUNNING,'1');
  assert.equal(result.grade.provenance.node,'fixture-node');assert.equal(result.grade.provenance.commit,'abc123');
});

test('grade reentrancy refuses the launch even when execution is supplied',async()=>{
  let launches=0;
  const {gradeCommand}=createGradeCommand({resolveItem:async()=>({ref:'01',dir:process.cwd()}),requireLocalCheckout:()=>{},readRuns:async()=>[],deriveNodeId:async()=> 'fixture',headCommit:async()=>null,spawnRubricAsync:async()=>{launches++;throw Error('must not launch');}});
  const result=await gradeCommand.run({ref:'01',run:true,env:{AOF_GRADE_RUNNING:'1'}},{workspace:{projectRoot:process.cwd(),config:{work:{rubric:{command:['fixture-runner'],report:{format:'tap'}}}}}});
  assert.equal(result.launched,0);assert.equal(launches,0);assert.ok(result.grade.codes.includes('runner-spawn-failed'));
});
