import type { ReactNode } from 'react';
import type { DocumentGroup, DocumentView, DocumentViewSummary } from '../api/types';
import { Icon } from '../components/Icon';
import docs from '../routes/documents.module.css';

export const HOUSE_DOCUMENT_GROUPS: ReadonlyArray<readonly [DocumentGroup, string]> = [
  ['plans', 'Planimetrie'], ['building', 'Pratiche edilizie e catastali'],
  ['energy', 'APE e certificazioni energetiche'], ['contracts', 'Contratti'],
  ['other', 'Altri documenti della casa'],
];
const views: ReadonlyArray<readonly [DocumentView, string, string]> = [
  ['all', 'Tutti i documenti', 'Tutti'], ['house', 'Documenti della casa', 'Della casa'],
  ['objects', 'Documenti di oggetti e impianti', 'Degli oggetti'],
];

export function DocumentViews({ value, summary, onChange }: {
  value: DocumentView; summary?: DocumentViewSummary; onChange: (value: DocumentView) => void;
}) {
  return <div className={docs.archiveViews} role="group" aria-label="Vista dei documenti">
    {views.map(([id, label, short]) => <button type="button" key={id} aria-pressed={value === id} aria-label={label} onClick={() => onChange(id)}>
      <span className={docs.viewDesktop}>{label}</span><span className={docs.viewMobile}>{short}</span>
      {summary && <span className={docs.viewCount}>{summary.views[id]}</span>}
    </button>)}
  </div>;
}

/** Counts cover the entire filtered archive; expanding a category fetches its own pages. */
export function HouseDocumentGroups({ summary, selected, onChange, children }: {
  summary: DocumentViewSummary; selected?: DocumentGroup;
  onChange: (value?: DocumentGroup) => void; children?: ReactNode;
}) {
  return <div className={docs.houseGroups} aria-label="Documenti della casa per tipologia">
    {HOUSE_DOCUMENT_GROUPS.map(([id, label]) => <section className={docs.houseGroup} key={id}>
      <h3><button type="button" aria-label={`${label}, ${summary.groups[id]} document${summary.groups[id] === 1 ? 'o' : 'i'}`} aria-expanded={selected === id} aria-controls={'house-group-' + id} onClick={() => onChange(selected === id ? undefined : id)}>
        <Icon name="document"/><span className={docs.groupLabel}>{label}</span><strong>{summary.groups[id]}</strong><span aria-hidden="true">{selected === id ? '⌄' : '›'}</span>
      </button></h3>
      <div id={'house-group-' + id} hidden={selected !== id}>{selected === id && children}</div>
    </section>)}
  </div>;
}
