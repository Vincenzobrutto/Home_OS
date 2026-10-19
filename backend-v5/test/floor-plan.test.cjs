const {test}=require('node:test'),assert=require('node:assert/strict');
const {floorPlanOutput,planPoints}=require('../dist/object-onboarding/floor-plan-domain');
test('floor plan: full-page bounds, stable point numbers and unnamed room names',()=>{
 const rooms=Array.from({length:7},(_,i)=>({page:1,x:.1+i*.1,y:.5,type:i===0?'kitchen':'other'}));
 const plan=floorPlanOutput({rooms,view:{page:1,x:0,y:0,width:1,height:1},warnings:[]},1);
 assert.equal(plan.points[4].number,5);assert.equal(plan.points[4].name,'Ambiente 5');
 plan.points[1].included=false;plan.points[4].name='Studio';
 const points=planPoints(plan.points);assert.equal(points[4].number,5);assert.equal(points[6].number,7);
 assert.throws(()=>floorPlanOutput({rooms:[{...rooms[0],x:1.2}],view:plan.view,warnings:[]},1));
 assert.throws(()=>planPoints([points[0],points[0]]));
 assert.throws(()=>floorPlanOutput({rooms:[rooms[0],rooms[0]],view:plan.view,warnings:[]},1));
 assert.throws(()=>floorPlanOutput({rooms:[{...rooms[0],page:2}],view:plan.view,warnings:[]},1));
 assert.throws(()=>floorPlanOutput({rooms:[rooms[0]],view:{...plan.view,width:.05},warnings:[]},1));
});
test('floor plan: dedicated visual provider path, no product extraction and no network',async()=>{
 const {ObjectOnboardingAnthropicProvider}=require('../dist/object-onboarding/anthropic-provider');
 const {digest}=require('../dist/security');
 const bytes=Buffer.from('synthetic bytes only'),snapshot={documentId:'a',documentVersion:1,documentSha256:digest(bytes)};
 let authorized=0;
 const transport={prepareStructured:async(model,system,messages,schema,signal,authorize)=>{await authorize();assert.equal(messages[0].content[0].type,'document');assert(system.includes('FULL physical page'));return {model,max_tokens:4096,messages,system,output_config:{format:{type:'json_schema',schema}}};}};
 const provider=new ObjectOnboardingAnthropicProvider({pageCount:async()=>1,extract:()=>assert.fail('floor plans must use the visual PDF, even with a text layer')},transport);
 const prepared=await provider.prepare({bytes,snapshot,mimeType:'application/pdf'},'synthetic-model',new AbortController().signal,async()=>{authorized++;},'floor_plan');
 assert.equal(authorized,2);
 const output=provider.decode({id:'test',model:'synthetic-model',stop_reason:'end_turn',usage:{input_tokens:100,output_tokens:100},content:[{type:'text',text:JSON.stringify({rooms:[{page:1,x:.5,y:.5,type:'other'}],view:{page:1,x:0,y:0,width:1,height:1},warnings:[]})}]},prepared).output;
 assert.deepEqual(output.items,[]);assert.equal(output.floorPlan.points[0].name,'Ambiente 1');assert.equal(output.needsReview,true);
});
