// Componenti isolati dell'archivio assistito. Nessun aggancio a router, client o pagine comuni:
// il container Codex fornisce dati e callback tramite props (vedi docs/document-intake-20261016).
export * from './model';
export { DocumentIntakeAssistant, StatusBadge, type DocumentIntakeAssistantProps } from './DocumentIntakeAssistant';
export { ReviewDialog, Modal, type ReviewWriteState } from './ReviewDialog';
export { DocumentCollectionFilters, type CollectionFilter } from './DocumentCollectionFilters';
