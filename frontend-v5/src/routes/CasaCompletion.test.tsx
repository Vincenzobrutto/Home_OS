import {render,screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router';
import {it,expect,vi,beforeEach} from 'vitest';
import {CasaCompletion} from './CasaCompletion';
const hooks=vi.hoisted(()=>({docs:vi.fn(),review:vi.fn()}));
vi.mock('./CasaDocumentsSummary',()=>({useCasaDocumentCounts:hooks.docs,CasaDocumentsSummary:()=> <p>Conteggi documenti</p>}));
vi.mock('../review/hooks',()=>({useReview:hooks.review}));
vi.mock('./CasaTasksSummary',()=>({CasaReviewSummary:()=> <p>Conteggi verifiche</p>}));
const ready=(analyzing=0)=>({isSuccess:true,isError:false,data:{counts:{to_compile:0,review:0,analyzing,attention:0,completed:17}}});
beforeEach(()=>{hooks.docs.mockReturnValue(ready());hooks.review.mockReturnValue({isSuccess:true,isError:false,data:{pages:[{openCount:0}]}});});
const show=()=>render(<MemoryRouter><CasaCompletion homeId="home-test"/></MemoryRouter>);
it('completed documents do not keep the pending dashboard open',()=>{show();expect(screen.getByText('Non ci sono attività da completare.')).toBeVisible();expect(screen.getByRole('link',{name:'Controlla i dati'})).toHaveAttribute('href','/home/home-test/review');});
it('analysis in progress must not look completed',()=>{hooks.docs.mockReturnValue(ready(1));show();expect(screen.queryByText('Non ci sono attività da completare.')).toBeNull();expect(screen.getByText('Conteggi documenti')).toBeVisible();});
it('cached zeros after error must not look completed',()=>{hooks.docs.mockReturnValue({...ready(),isError:true});show();expect(screen.queryByText('Non ci sono attività da completare.')).toBeNull();});
it('unknown review count must not look completed',()=>{hooks.review.mockReturnValue({isSuccess:true,isError:false,data:{pages:[{}]}});show();expect(screen.queryByText('Non ci sono attività da completare.')).toBeNull();});

it('a home with no documents offers a first step rather than completed work',()=>{
 hooks.docs.mockReturnValue({...ready(),data:{counts:{to_compile:0,review:0,analyzing:0,attention:0,completed:0}}});show();
 expect(screen.getByRole('heading',{name:'Inizia con un documento'})).toBeVisible();expect(screen.getByRole('link',{name:'Aggiungi documento'})).toHaveAttribute('href','/home/home-test/documenti?aggiungi=1');expect(screen.queryByText('Non ci sono attività da completare.')).toBeNull();
});
it('does not invite a read-only member to upload',()=>{
 hooks.docs.mockReturnValue({...ready(),data:{counts:{to_compile:0,review:0,analyzing:0,attention:0,completed:0}}});render(<MemoryRouter><CasaCompletion homeId="home-test" canUpload={false}/></MemoryRouter>);expect(screen.queryByRole('link',{name:'Aggiungi documento'})).toBeNull();
});
