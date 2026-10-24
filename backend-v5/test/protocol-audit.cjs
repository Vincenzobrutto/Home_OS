// Offline evidence only; this is not the provider's grammar compiler or a validator
// for its complete JSON Schema dialect. Never use it to authorize an AI dispatch.
const keywords=new Set(['type','properties','required','additionalProperties','items','enum','const','anyOf','allOf','$ref','definitions','$defs','$def','description','title','default','format','minItems']);
const types=new Set(['object','array','string','integer','number','boolean','null']);
function protocolAudit(schema){
 const issues=new Set(),stats={objects:0,properties:0,optional:0,unions:0,references:0,maxSchemaDepth:0};
 let visited=0;
 const visit=(node,ancestors=[],depth=0)=>{
  if(++visited>20000){issues.add('audit_budget_exceeded');return;}
  if(!node||typeof node!=='object'||Array.isArray(node)){issues.add('schema_not_object');return;}
  if(ancestors.includes(node)){issues.add('recursive_schema');return;}
  const next=[...ancestors,node];stats.maxSchemaDepth=Math.max(stats.maxSchemaDepth,depth);
  for(const key of Object.keys(node))if(!keywords.has(key))issues.add('keyword_not_audited');
  if(node.$ref!==undefined){
   stats.references++;
   if(typeof node.$ref!=='string'||!node.$ref.startsWith('#/')){issues.add('nonlocal_reference');return;}
   let target=schema;
   for(const token of node.$ref.slice(2).split('/').map(s=>s.replace(/~1/g,'/').replace(/~0/g,'~'))){
    target=target&&Object.hasOwn(target,token)?target[token]:undefined;
   }
   if(!target){issues.add('unresolved_reference');return;}
   if(Object.keys(node).length!==1)issues.add('reference_siblings_not_audited');
   visit(target,next,depth);return;
  }
  const declared=Array.isArray(node.type)?node.type:[node.type];
  if(node.type!==undefined&&declared.some(t=>!types.has(t)))issues.add('unknown_type');
  if(Array.isArray(node.type)||node.anyOf)stats.unions++;
  if(declared.includes('object')){
   stats.objects++;
   if(node.additionalProperties!==false)issues.add('object_not_closed');
   if(!node.properties||typeof node.properties!=='object'||Array.isArray(node.properties)){issues.add('properties_not_object');return;}
   const keys=Object.keys(node.properties),required=node.required??[];
   if(!Array.isArray(required)||required.some(k=>typeof k!=='string'||!keys.includes(k))||new Set(required).size!==required.length){issues.add('invalid_required');return;}
   stats.properties+=keys.length;stats.optional+=keys.filter(k=>!required.includes(k)).length;
   for(const child of Object.values(node.properties))visit(child,next,depth+1);
  }
  if(node.enum&&(!Array.isArray(node.enum)||node.enum.some(v=>v!==null&&typeof v==='object')))issues.add('complex_enum');
  if(node.minItems!==undefined&&![0,1].includes(node.minItems))issues.add('unsupported_min_items');
  if(node.items)visit(node.items,next,depth+1);
  for(const key of ['anyOf','allOf'])if(node[key]){
   if(!Array.isArray(node[key])){issues.add('branches_not_array');continue;}
   if(key==='allOf'&&node[key].some(branch=>branch?.$ref))issues.add('all_of_reference');
   for(const branch of node[key])visit(branch,next,depth+1);
  }
 };
 visit(schema);
 if(stats.optional>24)issues.add('optional_limit_exceeded');
 if(stats.unions>16)issues.add('union_limit_exceeded');
 return {scope:'documented_subset_expanded',...stats,issues:[...issues].sort(),remoteAcceptance:'not_proven'};
}
module.exports={protocolAudit};
