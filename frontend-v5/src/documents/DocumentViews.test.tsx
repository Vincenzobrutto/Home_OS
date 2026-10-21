import {render,screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {expect,it,vi} from 'vitest';
import {DocumentViews,HouseDocumentGroups} from './DocumentViews';
import {filtersFromParams,filtersToParams,sameFilters} from '../lib/documentSearch';
const summary={views:{all:34,house:29,objects:2},groups:{plans:25,building:1,energy:1,contracts:1,other:1}};
it('three views keep full accessible labels, selected state and server totals',async()=>{
 const user=userEvent.setup(),onChange=vi.fn();render(<DocumentViews value="house" summary={summary} onChange={onChange}/>);
 expect(screen.getByRole('button',{name:'Documenti della casa'})).toHaveAttribute('aria-pressed','true');
 expect(screen.getByRole('button',{name:'Tutti i documenti'})).toHaveTextContent('34');
 await user.click(screen.getByRole('button',{name:'Documenti di oggetti e impianti'}));expect(onChange).toHaveBeenCalledWith('objects');
});
it('category totals are independent from loaded rows; expanded category is closable and accessible',async()=>{
 const user=userEvent.setup(),onChange=vi.fn();render(<HouseDocumentGroups summary={summary} selected="plans" onChange={onChange}><a href="#document">Planimetria 25</a></HouseDocumentGroups>);
 expect(screen.getByRole('button',{name:'Planimetrie, 25 documenti'})).toHaveAttribute('aria-expanded','true');
 expect(screen.getAllByRole('link')).toHaveLength(1);
 await user.click(screen.getByRole('button',{name:/^Planimetrie/}));expect(onChange).toHaveBeenCalledWith(undefined);
 await user.click(screen.getByRole('button',{name:/^Contratti/}));expect(onChange).toHaveBeenLastCalledWith('contracts');
});
it('view, category, query and state survive detail/back URL; categories cannot leak into another view',()=>{
 const filters={q:'planimetria',format:'pdf' as const,visibility:'private' as const,workflow:'completed' as const,view:'house' as const,group:'plans' as const};
 expect(sameFilters(filters,filtersFromParams(filtersToParams(filters)))).toBe(true);
 expect(filtersToParams({...filters,view:'objects'}).has('group')).toBe(false);
 expect(filtersFromParams(new URLSearchParams('view=objects&group=plans')).group).toBeUndefined();
});
