import { initialForm, type CompilationDraft, type ContactInput, type Draft, type Form, type HouseForm } from './model';

export type CompilationMetadata = Pick<CompilationDraft,
  'documentTitle' | 'documentKind' | 'replaceOrganization' | 'reuseCopy'
>;

/** Restore editable decisions without replacing saved choices with new defaults. */
export function restoredItemForm(item: Draft['items'][number], draft: Draft, forms: Record<string, Form>): Form {
  const initial = initialForm(item, draft), saved = forms[item.id];
  return {
    ...initial, ...saved,
    ...(saved && !saved.expenseAutoState ? { expenseAutoState: 'manual' as const } : {}),
    fields: { ...initial.fields, ...saved?.fields },
  };
}

/** The open editor overrides only its own item; no edit keeps the original map. */
export function formsWithEditing(forms: Record<string, Form>, editing: { id: string; form: Form } | null) {
  return editing ? { ...forms, [editing.id]: editing.form } : forms;
}

type CompilationInput = {
  metadata: CompilationMetadata | undefined;
  documentOnly: boolean;
  directReference: boolean;
  documentTarget: CompilationDraft['documentTarget'];
  manualTotal: string;
  contactInputs: Record<string, ContactInput>;
  savedHouseForms: Record<string, HouseForm> | undefined;
  houseReviews: Record<string, { form: HouseForm }>;
};

/** Serialize editable inputs only. Pending requests, versions and writes belong to the caller. */
export function compilationSnapshot({
  metadata, documentOnly, directReference, documentTarget, manualTotal,
  contactInputs, savedHouseForms, houseReviews,
}: CompilationInput) {
  return {
    saved: true as const,
    ...metadata,
    documentOnly,
    ...(directReference ? { documentTarget } : {}),
    manualTotal,
    contacts: Object.values(contactInputs),
    houseForms: {
      ...savedHouseForms,
      ...Object.fromEntries(Object.entries(houseReviews).map(([id, review]) => [id, review.form])),
    },
  };
}
