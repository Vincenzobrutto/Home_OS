const {wire}=require('./document-understanding-fixture.cjs');
const {ObjectOnboardingAnthropicProvider}=require('../dist/object-onboarding/anthropic-provider');
function pagedWire(f,sentPages=[1,2],pending=[]){
 const result=wire(f.raw),expenses=result.houseExpenses;
 result.invoicePages=Object.fromEntries(sentPages.map(page=>['p'+page,{kind:pending.includes(page)?'unreadable':'invoice',expenses:pending.includes(page)?[]:[expenses[page-1]]}]));
 result.houseExpenses=[];return result;
}
function decode(f,sentPages=[1,2],pending=[]){
 const provider=new ObjectOnboardingAnthropicProvider(null,null);provider.logger={warn:()=>{}};
 return provider.decode({id:'msg_offline',model:'offline',stop_reason:'end_turn',usage:{input_tokens:100,output_tokens:100},content:[{type:'text',text:JSON.stringify(pagedWire(f,sentPages,pending))}]},{request:{model:'offline',max_tokens:4096},context:{...f.context,allowedPages:sentPages}}).output;
}
module.exports={pagedWire,decode};
