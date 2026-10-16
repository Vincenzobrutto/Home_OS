// Punto d'ingresso dei componenti isolati della ricevuta assistita. Nessun aggancio a router o client comuni:
// il container di Codex fornisce dati e callback tramite props (vedi docs/receipt-assistance-20261016).
export * from './model';
export { ReceiptAssistant, type ReceiptAssistantProps } from './ReceiptAssistant';
export { ReceiptFieldInput, ComparisonField, FIELD_LABEL } from './ReceiptFields';
export { ObjectSection, ExpenseSection } from './ChoiceSections';
export { ReceiptSummaryView } from './ReceiptSummary';
export { SourceDialog, type SourceRequest } from './SourceDialog';
