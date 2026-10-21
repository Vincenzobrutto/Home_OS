import {render,screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {expect,it,vi} from 'vitest';
import {ArchiveFamilies} from './ArchiveFamilies';
import {ARCHIVE_GROUPS,DOCUMENT_FAMILIES} from './families';
import {filtersFromParams,filtersToParams,sameFilters} from '../lib/documentSearch';
import {queryKeys} from '../api/queryKeys';
const summary={views:{all:3,house:2,objects:2},groups:{works:2,warranty:1,unclassified:0}};
it('dieci famiglie con descrizioni su richiesta, focus e comando distinti',async()=>{
 const user=userEvent.setup(),onChange=vi.fn();render(<ArchiveFamilies summary={summary} onChange={onChange}/>);expect(DOCUMENT_FAMILIES).toHaveLength(10);expect(screen.getAllByRole('button',{name:/^Informazioni su/})).toHaveLength(10);expect(screen.queryByText(/Preventivi, contratti/)).not.toBeInTheDocument();
 const info=screen.getByRole('button',{name:'Informazioni su Lavori, ristrutturazioni e bonus'});await user.click(info);expect(screen.getByRole('dialog',{name:'Lavori, ristrutturazioni e bonus'})).toBeVisible();expect(screen.getByText(/Preventivi, contratti/)).toBeVisible();expect(onChange).not.toHaveBeenCalled();await user.keyboard('{Escape}');expect(info).toHaveFocus();await user.click(screen.getByRole('button',{name:'Lavori, ristrutturazioni e bonus, 2 documenti'}));expect(onChange).toHaveBeenCalledWith('works');
});
it('Da classificare compare quando necessario; nessun conteggio dalle sole pagine caricate',()=>{
 render(<ArchiveFamilies summary={{...summary,groups:{...summary.groups,unclassified:35}}} selected="unclassified" onChange={()=>{}}><p>Prima pagina di documenti</p></ArchiveFamilies>);expect(screen.getByRole('button',{name:'Da classificare, 35 documenti'})).toHaveAttribute('aria-expanded','true');expect(screen.getByText('Prima pagina di documenti')).toBeVisible();
});
it('indirizzi e cache distinguono famiglia e collegamento, con ritorno senza perdita del contesto',()=>{
 for(const [group] of ARCHIVE_GROUPS){const f={q:'fattura',format:'pdf' as const,visibility:'private' as const,view:'archive' as const,group,related:'objects' as const,workflow:'completed' as const};expect(sameFilters(f,filtersFromParams(filtersToParams(f)))).toBe(true);expect(queryKeys.documentSearch('a','h',f)).not.toEqual(queryKeys.documentSearch('a','h',{...f,related:'house'}));}
});
