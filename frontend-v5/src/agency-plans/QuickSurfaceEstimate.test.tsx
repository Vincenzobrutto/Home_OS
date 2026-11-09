import {useState,type ComponentProps} from 'react';
import {render,screen,waitFor,within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {it,expect,vi,beforeEach} from 'vitest';
import {QuickSurfaceEstimate,type ScaleSelection} from './QuickSurfaceEstimate';
import {detectPlanScale} from './detectPlanScale';
vi.mock('./detectPlanScale',()=>({detectPlanScale:vi.fn()}));
const room={id:'r',label:'Cucina',kind:'kitchen',points:[[0,0],[100,0],[100,100],[0,100]] as [number,number][],holes:[]};
const balcony={id:'balcony',label:'Balcone',kind:'balcony',points:[[100,0],[120,0],[120,20],[100,20]] as [number,number][],holes:[]};
const bar={bar:{start:[0,0] as [number,number],end:[100,0] as [number,number],metres:10,method:'detected_bar' as const},denominator:null,ambiguous:false};
const props=()=>({active:true,sourceUrl:'blob:synthetic',width:2100,height:2970,rooms:[room],gross:null,busy:false,requestSegment:vi.fn(),onSave:vi.fn(),onFocus:vi.fn(),advanced:<p>Modulo dettagliato</p>});
function Estimate(p:Omit<ComponentProps<typeof QuickSurfaceEstimate>,'selection'|'onSelection'>&{initial?:ScaleSelection}){
 const [selection,onSelection]=useState<ScaleSelection>(p.initial??{mode:'auto',segment:null});
 return <QuickSurfaceEstimate {...p} selection={selection} onSelection={onSelection}/>;
}
const summary=()=>screen.getByRole('group',{name:'Stima della superficie commerciale'});
const total=()=>within(summary()).getByText('Totale stimato').nextElementSibling?.textContent;
beforeEach(()=>{vi.mocked(detectPlanScale).mockReset();});

it('shows scale, gross, appurtenances and total together from a detected bar, with no mandatory inputs',async()=>{
 vi.mocked(detectPlanScale).mockResolvedValue(bar);
 render(<Estimate {...props()}/>);
 await waitFor(()=>expect(total()).toBe('110,0 m²'));
 expect(summary()).toHaveTextContent('Barra metrica del documento · 10 m');
 expect(summary()).toHaveTextContent('Lordo stimato · vani + muri 10%110,0 m²');
 expect(summary()).toHaveTextContent('Pertinenze ponderate0,0 m²');
 expect(screen.getByRole('table',{name:'Superfici dei vani'})).toHaveTextContent('100,0 m²');
 expect(screen.getAllByRole('table')).toHaveLength(1);
 expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
 expect(screen.queryByText('Modulo dettagliato')).not.toBeInTheDocument();
});

it('requires explicit confirmation of the OCR ratio even after the sheet format is chosen',async()=>{
 vi.mocked(detectPlanScale).mockResolvedValue({bar:null,denominator:100,ambiguous:false});
 const user=userEvent.setup();render(<Estimate {...props()}/>);
 await waitFor(()=>expect(screen.getByLabelText('Scala dichiarata · 1:')).toHaveValue(100));
 expect(screen.getByText(/Lettura OCR da verificare · 1:100/)).toBeVisible();
 expect(screen.getByLabelText('Formato del foglio')).toHaveValue('');
 expect(total()).toBe('—');
 await user.selectOptions(screen.getByLabelText('Formato del foglio'),'A4');
 expect(total()).toBe('—');
 await user.click(screen.getByRole('button',{name:'Conferma scala 1:100'}));
 expect(summary()).toHaveTextContent('Scala 1:100 su foglio A4 intero');
 expect(total()).toBe('1,1 m²');
});

it('says when no scale is found and offers both the sheet fields and two points on the map',async()=>{
 vi.mocked(detectPlanScale).mockResolvedValue({bar:null,denominator:null,ambiguous:false});
 render(<Estimate {...props()}/>);
 expect(await screen.findByText(/Scala non trovata sul documento/)).toBeVisible();
 expect(screen.getByRole('button',{name:'Misura due punti sulla mappa'})).toBeEnabled();
 expect(summary()).toHaveTextContent('Da indicare');
});

it('does not run OCR before entering the calculation, nor when a saved scale exists',()=>{
 const {rerender}=render(<Estimate {...props()} active={false}/>);
 expect(detectPlanScale).not.toHaveBeenCalled();
 rerender(<Estimate {...props()} saved={{scale:{mode:'paper',format:'A4',denominator:100},savedAt:'2026-11-09T08:00:00.000Z',geometryRevision:1}}/>);
 expect(detectPlanScale).not.toHaveBeenCalled();
});

it('recalibrates with two points on the map and returns to the document scale',async()=>{
 vi.mocked(detectPlanScale).mockResolvedValue(bar);
 const user=userEvent.setup(),options=props();
 render(<Estimate {...options}/>);
 await waitFor(()=>expect(total()).toBe('110,0 m²'));
 options.requestSegment.mockImplementationOnce(done=>done([0,0],[200,0]));
 await user.click(screen.getByRole('button',{name:'Correggi con due punti sulla mappa'}));
 await user.type(screen.getByLabelText('Lunghezza reale tra i due punti (m)'),'10');
 expect(total()).toBe('27,5 m²');
 await user.click(screen.getByRole('button',{name:'Torna alla scala del documento'}));
 expect(total()).toBe('110,0 m²');
});

it('adds an existing balcony with its cover, coefficient and contribution, and no wall allowance on a gross outline',async()=>{
 vi.mocked(detectPlanScale).mockResolvedValue(bar);
 const user=userEvent.setup();
 render(<Estimate {...props()} rooms={[room,balcony]} gross={{shape:{...room,id:'gross',label:'Perimetro lordo'},status:'saved'}}/>);
 await waitFor(()=>expect(total()).toBe('100,0 m²'));
 expect(summary()).toHaveTextContent('Scegli Coperto o Scoperto per Balcone');
 await user.click(screen.getByRole('radio',{name:'Scoperto'}));
 expect(total()).toBe('101,0 m²');
 expect(screen.getByText(/4,0 m² × 25% =/)).toBeVisible();
 await user.click(screen.getByRole('radio',{name:'Coperto'}));
 expect(total()).toBe('101,4 m²');
 expect(summary()).toHaveTextContent('Lordo appartamento100,0 m²');
 expect(screen.getByRole('table',{name:'Superfici dei vani'})).toHaveTextContent('Compreso nel lordo');
 expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

it('flags a balcony overlapping the gross outline as a double count risk',async()=>{
 vi.mocked(detectPlanScale).mockResolvedValue(bar);
 const gross={id:'gross',label:'Perimetro lordo proposto',points:[[0,0],[110,0],[110,100],[0,100]] as [number,number][],holes:[]};
 render(<Estimate {...props()} rooms={[room,balcony]} gross={{shape:gross,status:'proposed'}}/>);
 expect(await screen.findByText(/Rischio di doppio conteggio: Balcone/)).toBeVisible();
 expect(summary()).toHaveTextContent('Lordo appartamento · proposto');
});

it('saves covers and the scale in use in one action, then reads the saved choice back as saved',async()=>{
 vi.mocked(detectPlanScale).mockResolvedValue(bar);
 const user=userEvent.setup(),options=props();
 const {rerender}=render(<Estimate {...options} rooms={[room,balcony]}/>);
 await waitFor(()=>expect(total()).not.toBe('—'));
 await user.click(screen.getByRole('radio',{name:'Coperto'}));
 expect(screen.getByText(/Da salvare: copertura dei balconi, scala/)).toBeVisible();
 await user.click(screen.getByRole('button',{name:'Salva stima'}));
 const payload={covers:[{id:'balcony',cover:'covered'}],scale:{mode:'bar',start:[0,0],end:[100,0],metres:10},parameters:{wallPercent:10,coefficients:[]}};
 expect(options.onSave).toHaveBeenCalledWith(payload);
 rerender(<Estimate {...options} rooms={[room,balcony]} balconyCovers={[{id:'balcony',cover:'covered'}]} saved={{scale:payload.scale as never,savedAt:'2026-11-09T08:00:00.000Z',geometryRevision:1}}/>);
 expect(screen.getByRole('button',{name:'Stima salvata'})).toBeDisabled();
 expect(screen.getByText(/Stima salvata il .*non computo dettagliato/)).toBeVisible();
});

it('restores a saved cover and sheet scale on reopening without reading the document again',()=>{
 render(<Estimate {...props()} rooms={[room,balcony]} balconyCovers={[{id:'balcony',cover:'uncovered'}]} saved={{scale:{mode:'paper',format:'A4',denominator:100},savedAt:'2026-11-09T08:00:00.000Z',geometryRevision:1}}/>);
 expect(screen.getByRole('radio',{name:'Scoperto'})).toBeChecked();
 expect(screen.getByLabelText('Formato del foglio')).toHaveValue('A4');
 expect(summary()).toHaveTextContent('Scala 1:100 su foglio A4 intero');
 expect(screen.getByRole('button',{name:'Stima salvata'})).toBeDisabled();
 expect(detectPlanScale).not.toHaveBeenCalled();
});

it('shows optional corrections in the surface table and keeps detailed computation separate',async()=>{
 vi.mocked(detectPlanScale).mockResolvedValue(bar);
 const user=userEvent.setup();render(<Estimate {...props()}/>);
 expect(screen.queryByLabelText('Maggiorazione muri senza perimetro lordo (%)')).not.toBeInTheDocument();
 await user.click(await screen.findByRole('button',{name:'Correggi parametri · facoltativo'}));
 expect(screen.getByRole('table',{name:'Superfici dei vani'})).toContainElement(screen.getByLabelText('Maggiorazione muri senza perimetro lordo (%)'));
 expect(screen.queryByText('Modulo dettagliato')).not.toBeInTheDocument();
 await user.click(screen.getByText('Computo dettagliato · facoltativo'));
 expect(screen.getByText('Modulo dettagliato')).toBeVisible();
});

it('reproduces the total on a fresh mount using saved wall and room coefficients',async()=>{
 vi.mocked(detectPlanScale).mockResolvedValue(bar);
 const user=userEvent.setup(),options=props();
 const view=render(<Estimate {...options} rooms={[room,balcony]}/>);
 await waitFor(()=>expect(total()).not.toBe('—'));
 await user.click(screen.getByRole('button',{name:'Correggi parametri · facoltativo'}));
 await user.click(screen.getByRole('radio',{name:'Coperto'}));
 const walls=screen.getByLabelText('Maggiorazione muri senza perimetro lordo (%)');
 await user.clear(walls);await user.type(walls,'12');
 const roomCoefficient=screen.getByLabelText('Coefficiente di Cucina (%)');
 await user.clear(roomCoefficient);await user.type(roomCoefficient,'90');
 const before=total();
 await user.click(screen.getByRole('button',{name:'Salva stima'}));
 const payload=options.onSave.mock.calls[0]![0];
 expect(payload.parameters).toEqual({wallPercent:12,coefficients:[{id:room.id,coefficient:.9}]});
 view.unmount();
 render(<Estimate {...options} rooms={[room,balcony]} balconyCovers={payload.covers} saved={{scale:{metres:10,end:[100,0],mode:'bar',start:[0,0]},parameters:payload.parameters,savedAt:'2026-11-09T08:00:00.000Z',geometryRevision:1}}/>);
 expect(screen.getByRole('radio',{name:'Coperto'})).toBeChecked();
 expect(total()).toBe(before);
 expect(screen.getByRole('button',{name:'Stima salvata'})).toBeDisabled();
});
