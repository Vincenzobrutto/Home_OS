// economy-v1 (S1a/b): tipi di trasporto normativi, copiati senza modifiche semantiche da
// docs/v5/economic-history-v1-wire-types.ts del master (contratto congelato 3c6aa59).
// Le somme sono stringhe di centesimi (CentsString); i singoli costi restano amountCents number H3a.
// I tipi S1c (bozze/job) sono presenti solo come punto d'integrazione: nessuna rotta S1c è usata qui.

export type UUID = string;
export type CalendarDate = string;
export type Timestamp = string;
export type CentsString = string;
export type Category = 'electricity'|'gas'|'water'|'internet_services'|'condominium_ordinary'|'condominium_extraordinary'|'insurance'|'taxes'|'maintenance'|'repairs_works'|'purchase_replacement'|'financing'|'other';
export type Family = 'utilities'|'condominium'|'taxes_insurance'|'maintenance_repairs'|'works_purchases'|'financing'|'unclassified';
export type Permission = 'read'|'edit';
export type Link<T> = {state:'none'|'unavailable';value:null}|{state:'linked';value:T};
export type ObjectRef = {kind:'object'|'boiler';id:UUID};
export type ObjectSummary = {ref:ObjectRef;name:string;state:'active'|'archived'};
export type WorkSummary = {id:UUID;name:string;state:'active'|'archived'};
export type AnalysisSummary = {draftId:UUID;documentId:UUID;documentVersion:number};
export type DocumentLink = {state:'none'|'unavailable';document:null}|{state:'linked';document:{id:UUID;name:string}};
export type AssetLink = {state:'none'|'unavailable';asset:null}|{state:'linked';asset:{id:UUID;name:string}};
export interface ExpenseSnapshot {
  title:string;amountCents:number;currency:'EUR';spentOn:CalendarDate;note:string|null;
  origin:'manual'|'document';documentLink:DocumentLink;assetLink:AssetLink;state:'active'|'archived';
  category:Category|null;family:Family;supplier:string|null;documentNumber:string|null;
  documentDate:CalendarDate|null;competenceFrom:CalendarDate|null;competenceTo:CalendarDate|null;dueOn:CalendarDate|null;
  amountOrigin:'user_declared'|'extraction_confirmed';objectLink:Link<ObjectSummary>;workLink:Link<WorkSummary>;analysisLink:Link<AnalysisSummary>;
}
export interface EconomyExpense extends ExpenseSnapshot {
  id:UUID;homeId:UUID;version:number;createdAt:Timestamp;updatedAt:Timestamp;archivedAt:Timestamp|null;permissions:Permission[];
}
export interface EconomyWork {
  id:UUID;homeId:UUID;name:string;note:string|null;state:'active'|'archived';version:number;
  activityLink:Link<{id:UUID;title:string}>;createdAt:Timestamp;updatedAt:Timestamp;archivedAt:Timestamp|null;permissions:Permission[];
}
export interface Page<T> {items:T[];nextCursor:string|null}
export interface Period {from:CalendarDate;to:CalendarDate}
export type Comparison =
  | {status:'unavailable';period:null;count:null;totalCents:null;deltaCents:null;deltaPercentHundredths:null;calendarAdjustment:'none'}
  | {status:'no_previous_records';period:Period;count:0;totalCents:'0';deltaCents:CentsString;deltaPercentHundredths:null;calendarAdjustment:'none'|'leap_day_clamped'}
  | {status:'comparable';period:Period;count:number;totalCents:CentsString;deltaCents:CentsString;deltaPercentHundredths:CentsString;calendarAdjustment:'none'|'leap_day_clamped'};
export interface EconomySummary {
  period:Period&{basis:'reference_date'};count:number;totalCents:CentsString;totalWithoutFinancingCents:CentsString;
  byCategory:{category:Category|null;count:number;totalCents:CentsString}[];
  byFamily:{family:Family;count:number;totalCents:CentsString}[];
  comparison:Comparison;asOf:Timestamp;today:CalendarDate;timeZone:'Europe/Rome';
}
export interface SourceCitation {documentId:UUID;documentVersion:number;sha256:string;page:number;excerpt:string}
export type ProposedFields = Partial<{
  title:{value:string;sources:SourceCitation[]};supplier:{value:string;sources:SourceCitation[]};category:{value:Category;sources:SourceCitation[]};
  documentNumber:{value:string;sources:SourceCitation[]};documentDate:{value:CalendarDate;sources:SourceCitation[]};
  competenceFrom:{value:CalendarDate;sources:SourceCitation[]};competenceTo:{value:CalendarDate;sources:SourceCitation[]};dueOn:{value:CalendarDate;sources:SourceCitation[]};
}>;
export interface AmountCandidate {id:string;amountCents:number;role:'current_document_total'|'amount_due'|'arrears_balance'|'taxable'|'tax'|'line_total'|'other';label:string;sources:SourceCitation[]}
export type Provider = 'test_fixture_v1'|'anthropic';
export interface EconomicDraft {
  id:UUID;homeId:UUID;version:number;state:'open'|'parked'|'confirmed';documentLink:DocumentLink;
  provider:Provider;isSimulation:boolean;model:string|null;documentKind:'utility_bill'|'simple_invoice';
  proposedFields:ProposedFields;amountCandidates:AmountCandidate[];amountSelectionRequired:boolean;
  expenseLink:Link<{id:UUID;title:string}>;createdAt:Timestamp;updatedAt:Timestamp;permissions:Permission[];
}
export interface DraftListItem {
  id:UUID;homeId:UUID;version:number;state:EconomicDraft['state'];documentLink:DocumentLink;
  documentKind:EconomicDraft['documentKind'];provider:Provider;isSimulation:boolean;expenseLink:EconomicDraft['expenseLink'];
  createdAt:Timestamp;updatedAt:Timestamp;permissions:Permission[];
}
export interface ExpenseValues {
  title:string;amountCents:number;spentOn:CalendarDate;note?:string|null;category?:Category|null;supplier?:string|null;
  documentNumber?:string|null;documentDate?:CalendarDate|null;competenceFrom?:CalendarDate|null;competenceTo?:CalendarDate|null;dueOn?:CalendarDate|null;
  objectRef?:ObjectRef|null;workId?:UUID|null;
}
export type CreateExpense = ExpenseValues&{documentId?:UUID|null};
export type UpdateExpense = Partial<CreateExpense>&{expectedVersion:number};
export type ConfirmDraft =
  | {expectedVersion:number;mode:'create';values:ExpenseValues;amountSelection:{mode:'candidate';candidateId:string}|{mode:'manual'}}
  | {expectedVersion:number;mode:'link_existing';expenseId:UUID;expectedExpenseVersion:number};
export interface ExpenseHistoryEvent {id:UUID;kind:'created'|'updated'|'archived'|'restored';at:Timestamp;note:string|null;before:ExpenseSnapshot|null;after:ExpenseSnapshot}
export type WorkSnapshot = Pick<EconomyWork,'name'|'note'|'state'|'activityLink'>;
export interface WorkHistoryEvent {id:UUID;kind:'created'|'updated'|'archived'|'restored';at:Timestamp;before:WorkSnapshot|null;after:WorkSnapshot}
export interface ProviderDescriptor {id:Provider;label:string;enabled:boolean;disabledReason:string|null;isSimulation:boolean;model:string|null}
export interface EconomyCapabilities {
  apiVersion:'economy-v1';enabled:boolean;isSimulation:false;currency:'EUR';today:CalendarDate;asOf:Timestamp;timeZone:'Europe/Rome';
  features:{history:boolean;works:boolean;documentDrafts:boolean};
  limits:{titleMaxCodePoints:120;noteMaxCodePoints:500;amountMaxCents:999999999;maxPageSize:50};
  categories:{code:Category;label:string;possibleFamilies:Family[]}[];families:{code:Family;label:string}[];
  analysis:{enabled:boolean;disabledReason:string|null;providers:ProviderDescriptor[]};
}
export interface CandidateExpense {expense:EconomyExpense;reasons:('same_document'|'same_number_supplier'|'same_amount_date')[]}
export interface EconomicAnalysisJob {
  id:UUID;homeId:UUID;version:number;state:'queued'|'running'|'succeeded'|'failed';provider:Provider;isSimulation:boolean;
  model:string|null;documentLink:DocumentLink;draftId:UUID|null;error:{code:string;message:string}|null;
  billing:Billing|null;createdAt:Timestamp;updatedAt:Timestamp;permissions:Permission[];
}
export interface Billing {currency:'USD';maxReservedUsd:string;actualUsd:string|null;state:'uncertain'|'settled'|'reserved'}
