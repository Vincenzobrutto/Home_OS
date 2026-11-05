import {render,screen,waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {it,expect,vi,beforeEach} from 'vitest';
import {QuickSurfaceEstimate} from './QuickSurfaceEstimate';
import {detectPlanScale} from './detectPlanScale';
vi.mock('./detectPlanScale',()=>({detectPlanScale:vi.fn()}));
const room={id:'r',label:'Cucina',kind:'kitchen',points:[[0,0],[100,0],[100,100],[0,100]] as [number,number][],holes:[]};
const props=()=>({active:true,sourceUrl:'blob:synthetic',width:2100,height:2970,rooms:[room],busy:false,requestSegment:vi.fn(),advanced:<p>Modulo dettagliato</p>});
beforeEach(()=>{vi.mocked(detectPlanScale).mockReset();});
it('automatically gives areas from a detected bar without wall inputs or mandatory confirmations',async()=>{vi.mocked(detectPlanScale).mockResolvedValue({bar:{start:[0,0],end:[100,0],metres:10,method:'detected_bar'},denominator:null,ambiguous:false});render(<QuickSurfaceEstimate {...props()}/>);expect(await screen.findByText('110,0 m²')).toBeVisible();expect(screen.getByRole('table',{name:'Superficie netta per ambiente'})).toHaveTextContent('100,0 m²');expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();expect(screen.queryByText('Modulo dettagliato')).not.toBeInTheDocument();});
it('asks only for sheet format when a printed scale is detected, with no default A4 assumption',async()=>{vi.mocked(detectPlanScale).mockResolvedValue({bar:null,denominator:100,ambiguous:false});const user=userEvent.setup();render(<QuickSurfaceEstimate {...props()}/>);await waitFor(()=>expect(screen.getByLabelText('Scala sul documento · 1:')).toHaveValue(100));expect(screen.getByLabelText('Formato del foglio scansionato')).toHaveValue('');expect(screen.queryByText(/Commerciale stimata/)).not.toBeInTheDocument();await user.selectOptions(screen.getByLabelText('Formato del foglio scansionato'),'A4');expect(screen.getByText(/Commerciale stimata/)).toBeVisible();});
it('does not run OCR before entering calculation, and lets advanced controls remain optional',async()=>{render(<QuickSurfaceEstimate {...props()} active={false}/>);expect(detectPlanScale).not.toHaveBeenCalled();});

it('recalibrates directly from the estimate and restores the automatic reference', async () => {
 vi.mocked(detectPlanScale).mockResolvedValue({
  bar: {start:[0,0], end:[100,0], metres:10, method:'detected_bar'},
  denominator: null,
  ambiguous: false,
 });
 const user = userEvent.setup();
 const options = props();
 options.requestSegment.mockImplementationOnce(() => {});
 render(<QuickSurfaceEstimate {...options}/>);
 expect(await screen.findByText('110,0 m²')).toBeVisible();
 await user.click(screen.getByRole('button',{name:'Ricalibra sulla mappa'}));
 expect(screen.getByText('110,0 m²')).toBeVisible();
 options.requestSegment.mockImplementationOnce(done => done([0,0],[200,0]));
 await user.click(screen.getByRole('button',{name:'Ricalibra sulla mappa'}));
 await user.type(screen.getByLabelText('Lunghezza reale in metri'),'10');
 expect(screen.getByText('27,5 m²')).toBeVisible();
 await user.click(screen.getByRole('button',{name:'Torna alla scala automatica'}));
 expect(screen.getByText('110,0 m²')).toBeVisible();
});
