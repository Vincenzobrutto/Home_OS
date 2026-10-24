import { invoicePagesSchema } from './invoice-coverage';
import { productFields, type ProductEvidenceContext } from './domain';
import { DOCUMENT_KINDS } from '../document-intake/domain';
import { documentFactKeys } from './understanding';
import { objectTypes } from '../home-objects/domain';

const shape = (properties: Record<string, unknown>) => ({ type: 'object', properties, required: Object.keys(properties), additionalProperties: false });
// Wire schema uses only Anthropic-supported constraints. Full bounds are enforced locally.
const evidence = shape({ page: { type: 'integer' }, excerpt: { type: 'string' }, region: { anyOf: [{ type: 'null' }, shape({ x: { type: 'number' }, y: { type: 'number' }, width: { type: 'number' }, height: { type: 'number' } })] } });
export const OBJECT_ONBOARDING_SCHEMA = shape({
  documentKind: { type: 'string', enum: ['delivery_notice', 'order_confirmation', 'purchase_document', 'product_document', 'device_label', 'utility_bill', 'conformity_declaration', 'house_document', 'unsupported'] },
  houseExpenses:{type:'array',items:shape({fields:{type:'array',items:shape({field:{type:'string',enum:['title','supplier','category','documentNumber','documentDate','competenceFrom','competenceTo','dueOn']},value:{type:'string'},evidence})},amountCandidates:{type:'array',items:shape({id:{type:'string'},amountCents:{type:'integer'},role:{type:'string',enum:['current_document_total','amount_due','arrears_balance','taxable','tax','line_total','other']},label:{type:'string'},evidence})}})},
  documentInfo:{type:'array',items:shape({kind:{type:'string',enum:Object.keys(DOCUMENT_KINDS)},title:{type:'string'},evidence})},
  facts:{type:'array',items:shape({subjectIndex:{type:'integer'},field:{type:'string',enum:[...documentFactKeys]},value:{type:'string'},evidence})},
  hasMoreItems: { type: 'boolean' },
  requiresHumanReview: { type: 'boolean' },
  purchaseTotal: { anyOf: [{ type: 'null' }, shape({ amountCents: { type: 'integer' }, evidence })] },
  items: { type: 'array', items: shape({
    objectType:{type:'array',items:shape({value:{type:'string',enum:[...objectTypes]},certainty:{type:'string',enum:['certain','uncertain']},evidence})},
    subjectKind:{type:'string',enum:['product','system']},
    fields: { type: 'array', items: shape({ field: { type: 'string', enum: [...productFields] }, value: { type: 'string' }, evidence }) },
    quantity: { anyOf: [{ type: 'null' }, shape({ value: { type: 'integer' }, evidence })] },
    purchaseAmount: { anyOf: [{ type: 'null' }, shape({ amountCents: { type: 'integer' }, evidence })] },
    nameTruncated: { type: 'boolean' }, disposition: { type: 'string', enum: ['household_object', 'consumable', 'uncertain'] }, confidence: { type: 'string', enum: ['high', 'low'] },
  }) },
});

/** Source mode is already known: avoid repeating nullable regions in every nested branch. */
export function onboardingSchemaFor(kind:ProductEvidenceContext['kind'],sentInvoicePages:number[]=[]):Record<string,unknown>{
 const schema=JSON.parse(JSON.stringify(OBJECT_ONBOARDING_SCHEMA)) as Record<string,unknown>;
 if(kind==='visual_pdf'&&sentInvoicePages.length){const props=schema.properties as Record<string,unknown>;props.invoicePages=invoicePagesSchema((props.houseExpenses as {items:unknown}).items,sentInvoicePages);(schema.required as string[]).push('invoicePages');}
 const visit=(value:unknown)=>{if(!value||typeof value!=='object')return;const row=value as Record<string,unknown>,properties=row.properties as Record<string,unknown>|undefined;
  if(properties?.region){const prior=properties.region as {anyOf:unknown[]};properties.region=kind==='text'?{type:'null'}:prior.anyOf[1];}
  for(const child of Object.values(row))visit(child);
 };visit(schema);
 // Singleton arrays avoid nullable object branches in the provider grammar.
 const compact=(value:unknown)=>{if(!value||typeof value!=='object')return;const row=value as Record<string,unknown>;const props=row.properties as Record<string,unknown>|undefined;if(props)for(const key of ['purchaseTotal','purchaseAmount','quantity']){const field=props[key] as {anyOf?:unknown[]}|undefined;if(field?.anyOf)props[key]={type:'array',items:field.anyOf[1]};}for(const child of Object.values(row))compact(child);};compact(schema);
 const sharedEvidence=JSON.parse(JSON.stringify((schema.properties as Record<string,unknown>).purchaseTotal)) as {items:{properties:{evidence:unknown}}};
 const poolSchema=sharedEvidence.items.properties.evidence;
 const reference=(value:unknown)=>{if(!value||typeof value!=='object')return;const row=value as Record<string,unknown>,props=row.properties as Record<string,unknown>|undefined;if(props?.evidence)props.evidence={type:'integer'};for(const child of Object.values(row))reference(child);};reference(schema);
 const properties=schema.properties as Record<string,unknown>;
 properties.sources={type:'array',items:poolSchema};(schema.required as string[]).push('sources');
 if(kind==='visual_pdf'&&sentInvoicePages.length){
  // The wire shape and page checks stay identical. Share the fully transformed
  // expense grammar instead of repeating it globally and in every physical slot.
  const expenses=properties.houseExpenses as {items:unknown};
  schema.definitions={invoiceExpense:expenses.items};
  expenses.items={$ref:'#/definitions/invoiceExpense'};
  const slots=(properties.invoicePages as {properties:Record<string,{properties:{expenses:{items:unknown}}}>}).properties;
  for(const slot of Object.values(slots))slot.properties.expenses.items={$ref:'#/definitions/invoiceExpense'};
 }
 return schema;
}
