import {act,fireEvent,render,screen,within} from '@testing-library/react';
import {afterAll,beforeAll,describe,it,expect,vi} from 'vitest';
import {AgencyPracticePlanWorkspace} from './AgencyPracticePlanWorkspace';
import {MeasurementForm} from './MeasurementForm';
import {PolygonBuilder} from './PolygonBuilder';
import type {AgencyPlanPort,PlansResponse} from './api';
import type {MeasurementConfiguration,RequestPolygon} from './measurement-types';
import {ApiError} from '../api/errors';
const shape={id:'r',label:'Stanza',points:[[0,0],[10,0],[10,10],[0,10]] as [number,number][],holes:[]};
const plans=():PlansResponse=>({revision:4,plans:[{id:'plan',version:1,status:'draft',proof:{sourceId:'source',version:1,sha256:'a'.repeat(64),page:1},rooms:[structuredClone(shape)],mainPerimeter:null,rasterSize:{width:20,height:20},geometryRevision:1,issues:[]}]});
const error=(status:number,code='service_unavailable')=>new ApiError({kind:'http',status,code,message:'Synthetic failure'});
function port(){return {practice:vi.fn(async()=>({id:'p',label:'Pratica privata DEMO',revision:4,documents:[{id:'source',kind:'floor_plan',visibility:'private',version:1,filename:'sintetica.pdf'}]})),plans:vi.fn(async()=>plans()),image:vi.fn(async()=>new Blob(['synthetic'],{type:'image/png'})),edit:vi.fn<AgencyPlanPort['edit']>(async()=>({replay:false,plans:{...plans(),revision:5}}))};}
const oldCreate=URL.createObjectURL,oldRevoke=URL.revokeObjectURL;
beforeAll(()=>{URL.createObjectURL=vi.fn(()=> 'blob:synthetic-private');URL.revokeObjectURL=vi.fn();});afterAll(()=>{URL.createObjectURL=oldCreate;URL.revokeObjectURL=oldRevoke;});
async function loaded(api=port()){const view=render(<AgencyPracticePlanWorkspace api={api} scopeKey="a:g:p"/>);await screen.findByRole('img',{name:'Contorni dei singoli vani'});return {api,view};}
function dirtyGeometry(){fireEvent.click(screen.getByRole('button',{name:'Aggiungi punto su un lato'}));fireEvent.click(screen.getByRole('button',{name:'Inserisci punto sul lato 1'}));fireEvent.change(screen.getByLabelText('Motivo della modifica o del computo'),{target:{value:'Correzione sintetica'}});}
function fillScale(){fireEvent.change(screen.getByLabelText('Metodo di calibrazione'),{target:{value:'bar'}});for(const [name,value] of [['X iniziale','0'],['Y iniziale','0'],['X finale','10'],['Y finale','0'],['Lunghezza reale (m)','10']])fireEvent.change(screen.getByLabelText('Barra metrica · '+name),{target:{value}});fireEvent.click(screen.getByLabelText('Ho verificato gli estremi e la lunghezza della barra'));fireEvent.change(screen.getByLabelText('Versione criterio adottato'),{target:{value:'agenzia-sintetica-v1'}});fireEvent.change(screen.getByLabelText('Limite 25 cm del muro in comunione'),{target:{value:'physical_thickness'}});}
describe('practice plan workspace',()=>{
 it('reopens the raw API perimeter with a stable editor identity and saves subsequent corrections',async()=>{const api=port(),state=plans();state.plans[0]!.mainPerimeter={points:structuredClone(shape.points),holes:[]};api.plans.mockResolvedValue(state);await loaded(api);fireEvent.click(screen.getByRole('tab',{name:'Perimetro commerciale'}));expect(screen.getByRole('combobox',{name:'Geometria'})).toHaveDisplayValue('Perimetro lordo');dirtyGeometry();fireEvent.click(screen.getByRole('button',{name:'Salva correzione contorno'}));await screen.findByText('Modifiche salvate nella pratica.');expect(api.edit.mock.calls[0]![1].command).toMatchObject({operation:'geometry',view:'perimeter',id:'gross'});expect(state.plans[0]!.mainPerimeter!.points).toHaveLength(4);});
 it('notifies the parent revision only after a confirmed save, including an explicit retry',async()=>{const api=port(),onSaved=vi.fn();api.edit.mockRejectedValueOnce(error(503));render(<AgencyPracticePlanWorkspace api={api} scopeKey="saved-callback" onSaved={onSaved}/>);await screen.findByRole('img',{name:'Contorni dei singoli vani'});dirtyGeometry();fireEvent.click(screen.getByRole('button',{name:'Salva correzione contorno'}));await screen.findByRole('button',{name:'Riprova lo stesso salvataggio'});expect(onSaved).not.toHaveBeenCalled();fireEvent.click(screen.getByRole('button',{name:'Riprova lo stesso salvataggio'}));await screen.findByText('Modifiche salvate nella pratica.');expect(onSaved).toHaveBeenCalledOnce();fireEvent.click(screen.getByRole('button',{name:'Chiudi conferma di salvataggio'}));expect(screen.queryByText('Modifiche salvate nella pratica.')).not.toBeInTheDocument();expect(onSaved).toHaveBeenCalledOnce();});
 it('loads authorized data and image without dispatching analysis or saving on entry',async()=>{const {api}=await loaded();expect(screen.getByRole('heading',{name:'Pratica privata DEMO'})).toBeInTheDocument();expect(screen.getByText(/sintetica.pdf/)).toBeInTheDocument();expect(api.edit).not.toHaveBeenCalled();expect(api.image).toHaveBeenCalledWith('plan',expect.any(AbortSignal));});
 it('scope change clears private data and revokes its Blob URL before the new response',async()=>{const {view}=await loaded();const next={...port(),practice:vi.fn(()=>new Promise<Awaited<ReturnType<AgencyPlanPort['practice']>>>(()=>{}))};view.rerender(<AgencyPracticePlanWorkspace api={next} scopeKey="other"/>);expect(screen.queryByText('Pratica privata DEMO')).not.toBeInTheDocument();expect(screen.queryByText(/sintetica.pdf/)).not.toBeInTheDocument();expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:synthetic-private');});
 it('network ambiguity retries the same body/key only on explicit user action',async()=>{const api=port();api.edit.mockRejectedValueOnce(error(503));await loaded(api);dirtyGeometry();fireEvent.click(screen.getByRole('button',{name:'Salva correzione contorno'}));await screen.findByRole('button',{name:'Riprova lo stesso salvataggio'});expect(api.edit).toHaveBeenCalledTimes(1);fireEvent.click(screen.getByRole('button',{name:'Riprova lo stesso salvataggio'}));await screen.findByText('Modifiche salvate nella pratica.');expect(api.edit).toHaveBeenCalledTimes(2);expect(api.edit.mock.calls[0]).toEqual(api.edit.mock.calls[1]);});
 it('revision conflict freezes editing and does not resubmit automatically',async()=>{const api=port();api.edit.mockRejectedValueOnce(error(409,'revision_conflict'));await loaded(api);dirtyGeometry();fireEvent.click(screen.getByRole('button',{name:'Salva correzione contorno'}));await screen.findByText(/La pratica o il documento sono cambiati/);expect(api.edit).toHaveBeenCalledTimes(1);expect(screen.queryByRole('button',{name:'Riprova lo stesso salvataggio'})).not.toBeInTheDocument();expect(screen.queryByRole('button',{name:'Aggiungi punto su un lato'})).not.toBeInTheDocument();});
 it('a validation rejection preserves draft but permits correction instead of trapping a pending request',async()=>{const api=port();api.edit.mockRejectedValueOnce(error(422,'invalid_plan_input'));await loaded(api);dirtyGeometry();fireEvent.click(screen.getByRole('button',{name:'Salva correzione contorno'}));await screen.findByText(/nessuna modifica è stata salvata/);expect(screen.getByRole('button',{name:'Salva correzione contorno'})).toBeEnabled();expect(screen.getByRole('button',{name:'Aggiungi punto su un lato'})).toBeInTheDocument();expect(screen.queryByRole('button',{name:'Riprova lo stesso salvataggio'})).not.toBeInTheDocument();});
 it('access revocation hides private data and editor',async()=>{const api=port();api.edit.mockRejectedValueOnce(error(403,'access_denied'));await loaded(api);dirtyGeometry();fireEvent.click(screen.getByRole('button',{name:'Salva correzione contorno'}));await screen.findByText(/Accesso non disponibile/);expect(screen.queryByText(/sintetica.pdf/)).not.toBeInTheDocument();expect(screen.queryByRole('img',{name:'Contorni dei singoli vani'})).not.toBeInTheDocument();});
 it('stale source cannot request an image or offer measurement controls',async()=>{const api=port();api.plans.mockResolvedValue({revision:5,plans:[{...plans().plans[0]!,status:'stale',rooms:null}]});render(<AgencyPracticePlanWorkspace api={api} scopeKey="stale"/>);await screen.findByText(/analisi precedente non è più utilizzabile/);expect(api.image).not.toHaveBeenCalled();expect(screen.queryByRole('form',{name:'Calibrazione e computo'})).not.toBeInTheDocument();});
 it('gross perimeter starts empty and requires an explicit drawn boundary',async()=>{await loaded();fireEvent.click(screen.getByRole('tab',{name:'Perimetro commerciale'}));fireEvent.click(screen.getByRole('button',{name:'Definisci perimetro'}));expect(screen.getByText('0 vertici')).toBeInTheDocument();expect(screen.getByRole('button',{name:'Usa questo contorno'})).toBeDisabled();expect(screen.queryByTestId('shape-gross')).not.toBeInTheDocument();});

 it('traces and saves the gross perimeter separately from the room contours in the graphical editor',async()=>{
  const api=port(),state=plans(),plan=state.plans[0]!;
  const outline={points:[[0,0],[15,0],[15,15],[0,15]] as [number,number][],holes:[]};
  api.edit.mockResolvedValueOnce({replay:false,plans:{revision:5,plans:[{...plan,version:2,geometryRevision:2,mainPerimeter:outline}]}});
  render(<AgencyPracticePlanWorkspace api={api} scopeKey="draw-perimeter" embedded/>);
  await screen.findByRole('img',{name:'Contorni dei singoli vani'});
  fireEvent.click(screen.getByRole('button',{name:'Apri editor grafico'}));
  fireEvent.click(screen.getByRole('button',{name:'Disegna muri perimetrali'}));
  const builder=within(screen.getByRole('dialog',{name:'Disegna contorno'}));
  for(const [x,y] of outline.points){
   fireEvent.change(builder.getByLabelText('Nuovo vertice X'),{target:{value:String(x)}});
   fireEvent.change(builder.getByLabelText('Nuovo vertice Y'),{target:{value:String(y)}});
   fireEvent.click(builder.getByRole('button',{name:'Aggiungi vertice'}));
  }
  fireEvent.click(builder.getByRole('button',{name:'Usa questo contorno'}));
  expect(screen.getByLabelText('Muri perimetrali in bozza')).toHaveAttribute('stroke-dasharray');
  expect(api.edit).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button',{name:'Salva perimetro'}));
  expect(await screen.findByLabelText('Muri perimetrali salvati')).not.toHaveAttribute('stroke-dasharray');
  expect(api.edit).toHaveBeenCalledTimes(1);
  expect(api.edit.mock.calls[0]![1].command).toEqual({operation:'geometry',view:'perimeter',id:'gross',geometry:outline});
  fireEvent.click(screen.getByRole('checkbox',{name:'Muri perimetrali'}));
  expect(screen.queryByLabelText('Muri perimetrali salvati')).not.toBeInTheDocument();
 });

 it('includes the sole internal area from its check and preserves the outside contour on save',async()=>{
  const api=port(),state=plans(),plan=state.plans[0]!,room=plan.rooms![0]!;
  room.holes=[[[3,3],[7,3],[7,7],[3,7]]];
  room.symbols=[{id:'symbol',reason:'Area con una X'}];
  plan.issues=[{id:'symbol',code:'symbol_unresolved'}];
  api.plans.mockResolvedValue(state);
  api.edit.mockResolvedValueOnce({replay:false,plans:{revision:5,plans:[{...plan,version:2,geometryRevision:2,rooms:[{...room,holes:[]}]}]}});
  render(<AgencyPracticePlanWorkspace api={api} scopeKey="include-hole" embedded/>);
  await screen.findByRole('img',{name:'Contorni dei singoli vani'});
  fireEvent.click(screen.getByRole('button',{name:'Modifica contorno'}));
  expect(screen.getByRole('combobox',{name:'Contorno'})).toHaveDisplayValue('Vuoto 1');
  fireEvent.click(screen.getByRole('button',{name:'Includi area nel vano'}));
  expect(api.edit).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button',{name:'Salva modifiche'}));
  await screen.findByText('Modifiche salvate nella pratica.');
  expect(api.edit.mock.calls[0]![1].command).toMatchObject({operation:'geometry',view:'rooms',id:room.id,geometry:{points:room.points,holes:[]}});
  expect(screen.getByRole('option',{name:'Ho incluso l’elemento nel contorno'})).toBeEnabled();
 });
 it('opens the editable saved contour straight from a check during proposal comparison',async()=>{
  const api=port(),state=plans(),plan=state.plans[0]!,room=plan.rooms![0]!;
  plan.issues=[{id:room.id,code:'coverage_area_requires_review'}];
  plan.surfaceProposal={digest:'e'.repeat(64),state:'pending',baseGeometryRevision:1,rooms:[{...room,label:'Solo in anteprima'}],issues:[],summary:{doorArcs:0,serviceCells:0,exteriorStrips:0}};
  api.plans.mockResolvedValue(state);
  render(<AgencyPracticePlanWorkspace api={api} scopeKey="edit-from-check" embedded/>);
  await screen.findByRole('img',{name:'Contorni dei singoli vani'});
  fireEvent.click(screen.getByRole('button',{name:'Confronta i contorni proposti'}));
  expect(screen.getByRole('button',{name:'Seleziona vano Solo in anteprima'})).toBeVisible();
  fireEvent.click(screen.getByRole('button',{name:'Modifica contorno'}));
  expect(screen.queryByRole('button',{name:'Seleziona vano Solo in anteprima'})).not.toBeInTheDocument();
  const vertex=screen.getByRole('button',{name:'Vertice 1'});
  fireEvent.keyDown(vertex,{key:'ArrowRight'});
  fireEvent.click(screen.getByRole('button',{name:'Aggiungi punto su un lato'}));
  fireEvent.click(screen.getByRole('button',{name:'Inserisci punto sul lato 1'}));
  expect(screen.getAllByRole('button',{name:/^Vertice /})).toHaveLength(5);
  fireEvent.click(screen.getByRole('button',{name:'Vertice 3'}));
  fireEvent.click(screen.getByRole('button',{name:'Elimina punto'}));
  expect(api.edit).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button',{name:'Salva modifiche'}));
  await screen.findByText('Modifiche salvate nella pratica.');
  expect(api.edit.mock.calls[0]![1].command).toMatchObject({operation:'geometry',id:room.id,geometry:{points:[[20/600,0],[(20/600+10)/2,0],[10,10],[0,10]],holes:[]}});
 });
 it('highlights the saved analysis point when the check has no room contour',async()=>{
  const api=port(),state=plans(),plan=state.plans[0]!;
  plan.issues=[{id:'missing-room',code:'seed_region_unresolved',number:3},{id:'legacy',code:'seed_region_unresolved',number:4}];
  plan.reviewLocations=[{id:'missing-room',label:'Ripostiglio',point:[14,16]}];
  api.plans.mockResolvedValue(state);
  render(<AgencyPracticePlanWorkspace api={api} scopeKey="located-issue" embedded/>);
  await screen.findByRole('img',{name:'Contorni dei singoli vani'});
  fireEvent.click(screen.getByText('Ripostiglio'));
  expect(screen.getByRole('button',{name:'Mostra sulla mappa',pressed:true})).toBeVisible();
  expect(screen.getByTestId('focus-marker')).toHaveAttribute('cx','14');
  expect(screen.getByTestId('focus-marker')).toHaveAttribute('cy','16');
  expect(screen.queryByTestId('focus-outline')).not.toBeInTheDocument();
  expect(screen.getByText(/non ha ancora una posizione salvata/)).toBeVisible();
  expect(screen.getByRole('button',{name:'Posiziona verifica 4'})).toBeVisible();
  expect(api.edit).not.toHaveBeenCalled();
 });
 it('saves a position for an older check and uses it on the next card click',async()=>{
  const api=port(),state=plans(),plan=state.plans[0]!;
  plan.issues=[{id:'legacy',code:'seed_region_unresolved',number:4}];
  api.plans.mockResolvedValue(state);
  api.edit.mockResolvedValueOnce({replay:false,plans:{revision:5,plans:[{...plan,version:2,issues:[{...plan.issues[0]!,manualPoint:[14,16]}]}]}});
  render(<AgencyPracticePlanWorkspace api={api} scopeKey="place-legacy-check" embedded/>);
  await screen.findByRole('img',{name:'Contorni dei singoli vani'});
  fireEvent.click(screen.getByRole('button',{name:'Posiziona verifica 4'}));
  fireEvent.change(screen.getByLabelText('Nuovo vertice X'),{target:{value:'14'}});
  fireEvent.change(screen.getByLabelText('Nuovo vertice Y'),{target:{value:'16'}});
  fireEvent.click(screen.getByRole('button',{name:'Aggiungi vertice'}));
  fireEvent.click(screen.getByRole('button',{name:'Salva punto'}));
  await screen.findByRole('button',{name:'Mostra sulla mappa'});
  fireEvent.click(screen.getByRole('button',{name:'Mostra sulla mappa'}));
  expect(screen.getByTestId('focus-marker')).toHaveAttribute('cx','14');
  expect(api.edit.mock.calls[0]![1].command).toEqual({operation:'locate_issue',issueId:'legacy',code:'seed_region_unresolved',point:[14,16]});
 });
 it('links each open check to its room on the map and removes it once its outcome is saved',async()=>{
  const api=port(),state=plans(),plan=state.plans[0]!;
  plan.issues=[{id:'symbol',code:'symbol_unresolved',number:1},{id:'coverage',code:'coverage_search_limited',number:2}];
  plan.rooms![0]!.symbols=[{id:'symbol',reason:'Simbolo vicino alla parete',point:[5,5]}];
  api.plans.mockResolvedValue(state);
  api.edit.mockResolvedValueOnce({replay:false,plans:{revision:5,plans:[{...plan,version:2,issues:[plan.issues[1]!]}]}});
  render(<AgencyPracticePlanWorkspace api={api} scopeKey="issues" embedded/>);
  await screen.findByRole('img',{name:'Contorni dei singoli vani'});
  expect(screen.getByRole('heading',{name:'Verifiche aperte · 2'})).toBeVisible();
  expect(screen.getByText('Simbolo vicino alla parete')).toBeVisible();
  expect(screen.queryByTestId('focus-marker')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Modifica contorno'}));
  expect(screen.getByTestId('focus-marker')).toHaveAttribute('cx','5');
  expect(screen.getAllByRole('button',{name:/^Vertice /})).toHaveLength(4);
  fireEvent.change(screen.getByLabelText('Esito Stanza · verifica 1'),{target:{value:'excluded_from_computation'}});
  fireEvent.click(screen.getByRole('button',{name:'Chiudi verifica 1'}));
  await screen.findByText('Modifiche salvate nella pratica.');
  expect(screen.getByRole('heading',{name:'Verifiche aperte · 1'})).toBeVisible();
  expect(screen.queryByText('Simbolo vicino alla parete')).not.toBeInTheDocument();
  expect(screen.getByText('n. 2')).toBeInTheDocument();
  expect(api.edit.mock.calls[0]![1]).toMatchObject({reason:'Ho verificato che resta fuori dal computo',command:{operation:'resolve_issue',issueId:'symbol',code:'symbol_unresolved',resolution:'excluded_from_computation'}});
 });
});
describe('measurement choices',()=>{
 const props=()=>({rooms:[shape],hasPerimeter:false,busy:false,requestPolygon:vi.fn<RequestPolygon>(),requestSegment:vi.fn<(done:(a:[number,number],b:[number,number])=>void)=>void>(),onDirty:vi.fn(),onSave:vi.fn<(c:MeasurementConfiguration)=>void>()});
 it('does not infer scale or confirmations from the picture',()=>{const p=props();render(<MeasurementForm {...p}/>);fireEvent.submit(screen.getByRole('form',{name:'Calibrazione e computo'}));expect(p.onSave).not.toHaveBeenCalled();expect(screen.getByLabelText('Barra metrica · Lunghezza reale (m)')).toHaveValue(null);expect(screen.getByLabelText('Le fasce dei muri necessarie sono complete e non sovrapposte')).not.toBeChecked();});
 it('saves an unselected coefficient range as missing, never a midpoint',()=>{const p=props();render(<MeasurementForm {...p}/>);fillScale();fireEvent.change(screen.getByLabelText('Categoria di Stanza'),{target:{value:'disconnected_cellar'}});fireEvent.submit(screen.getByRole('form',{name:'Calibrazione e computo'}));expect(p.onSave).toHaveBeenCalledOnce();const c=p.onSave.mock.calls[0]![0];expect(c.assignments[0]!.coefficient).toBeUndefined();expect(c.wallCoverageConfirmed).toBe(false);expect(c.policyConfirmed).toBe(false);expect(c.calibration.metres).toBe(10);});
 it('drawn wall geometry is explicit and independent of room geometry',()=>{const p=props();render(<MeasurementForm {...p}/>);fillScale();fireEvent.change(screen.getByLabelText('Categoria di Stanza'),{target:{value:'principal'}});fireEvent.click(screen.getByRole('button',{name:'Disegna fascia muro'}));expect(p.requestPolygon.mock.calls[0]![0]).toBeNull();act(()=>p.requestPolygon.mock.calls[0]![1]({...shape,id:'wall',points:[[10,0],[11,0],[11,10],[10,10]]}));fireEvent.change(screen.getByLabelText('Tipo di muro'),{target:{value:'exclusive'}});fireEvent.change(screen.getByLabelText('Spessore muro 1 (m)'),{target:{value:'.2'}});fireEvent.submit(screen.getByRole('form',{name:'Calibrazione e computo'}));expect(p.onSave.mock.calls[0]![0].walls[0]!.thicknessMetres).toBe(.2);expect(p.onSave.mock.calls[0]![0].walls[0]!.uniformThicknessConfirmed).toBe(false);});
 it('a segment picker requires exactly two explicitly selected endpoints',()=>{const done=vi.fn();render(<PolygonBuilder mode="segment" initial={null} sourceUrl="blob:synthetic" width={20} height={20} onDone={done} onCancel={()=>{}}/>);for(const [x,y] of [[1,2],[15,2]]){fireEvent.change(screen.getByLabelText('Nuovo vertice X'),{target:{value:x}});fireEvent.change(screen.getByLabelText('Nuovo vertice Y'),{target:{value:y}});fireEvent.click(screen.getByRole('button',{name:'Aggiungi vertice'}));}fireEvent.click(screen.getByRole('button',{name:'Usa questi estremi'}));expect(done.mock.calls[0]![0].points).toEqual([[1,2],[15,2]]);});
});
describe('server surface proposals',()=>{
 function proposalPlans(){const value=plans();value.plans[0]!.surfaceProposal={digest:'c'.repeat(64),state:'pending',baseGeometryRevision:1,summary:{doorArcs:1,serviceCells:2,exteriorStrips:1},rooms:[structuredClone(shape),{id:'balcony',label:'Balcone proposto',points:[[12,0],[16,0],[16,10],[12,10]],holes:[]}],issues:[{id:'balcony',code:'exterior_use_and_association_require_review'}]};return value;}
 it('shows a read-only comparison and adopts only after review and a reason, using the digest',async()=>{const api=port();let current=proposalPlans();api.plans.mockImplementation(async()=>structuredClone(current));api.edit.mockImplementation(async(_id,body)=>{expect(body.command).toEqual({operation:'apply_surface_proposal',proposalDigest:'c'.repeat(64)});const next=structuredClone(current);next.revision++;const plan=next.plans[0]!;plan.rooms=plan.surfaceProposal!.rooms;plan.surfaceProposal!.state='applied';plan.geometryRevision=2;plan.version=2;current=next;return{replay:false,plans:next};});await loaded(api);expect(screen.queryByTestId('shape-balcony')).not.toBeInTheDocument();fireEvent.click(screen.getByRole('button',{name:'Confronta i contorni proposti'}));expect(screen.getByTestId('shape-balcony')).toBeInTheDocument();expect(screen.queryByRole('button',{name:'Aggiungi punto su un lato'})).not.toBeInTheDocument();expect(screen.getByRole('tab',{name:'Perimetro commerciale'})).toBeInTheDocument();expect(api.edit).not.toHaveBeenCalled();const adopt=screen.getByRole('button',{name:'Adotta i contorni proposti'});expect(adopt).toBeDisabled();fireEvent.click(screen.getByLabelText('Ho confrontato i contorni con l’originale'));expect(adopt).toBeDisabled();fireEvent.change(screen.getByLabelText('Motivo della modifica o del computo'),{target:{value:'Contorni verificati'}});fireEvent.click(adopt);await screen.findByText(/Correzioni adottate/);expect(screen.getByRole('button',{name:'Aggiungi punto su un lato'})).toBeEnabled();expect(api.edit).toHaveBeenCalledTimes(1);fireEvent.click(screen.getByRole('button',{name:'Ricarica pratica'}));await screen.findByText(/Correzioni adottate/);expect(screen.getByTestId('shape-balcony')).toBeInTheDocument();});
 it('switching back discards only the preview confirmation and sends no request',async()=>{const api=port();api.plans.mockResolvedValue(proposalPlans());await loaded(api);fireEvent.click(screen.getByRole('button',{name:'Confronta i contorni proposti'}));fireEvent.click(screen.getByLabelText('Ho confrontato i contorni con l’originale'));fireEvent.click(screen.getByRole('button',{name:'Torna ai contorni salvati'}));expect(screen.queryByTestId('shape-balcony')).not.toBeInTheDocument();expect(api.edit).not.toHaveBeenCalled();fireEvent.click(screen.getByRole('button',{name:'Confronta i contorni proposti'}));expect(screen.getByLabelText('Ho confrontato i contorni con l’originale')).not.toBeChecked();});
});
it('pale-scan recovery is described as a proposal and does not replace empty saved geometry automatically',async()=>{const api=port(),value=plans(),p=value.plans[0]!;p.rooms=[];p.surfaceProposal={digest:'d'.repeat(64),state:'pending',baseGeometryRevision:1,rooms:[structuredClone(shape)],issues:[{id:'contrast',code:'contrast_requires_review'}],summary:{doorArcs:0,serviceCells:0,exteriorStrips:0},contrast:{requiresReview:true,originalThreshold:180,proposedThreshold:245}};api.plans.mockResolvedValue(value);await loaded(api);expect(screen.getByText(/Scansione con tratti chiari/)).toBeInTheDocument();expect(screen.queryByTestId('shape-r')).not.toBeInTheDocument();fireEvent.click(screen.getByRole('button',{name:'Confronta i contorni proposti'}));expect(screen.getByTestId('shape-r')).toBeInTheDocument();expect(api.edit).not.toHaveBeenCalled();});

describe('saved measurements in the dual view',()=>{
 const measured=()=>{const value=plans(),p=value.plans[0]!;p.measurement={geometryRevision:1,totalM2:42,partialM2:42,status:'ready_for_review',certification:false,issues:[],surfaces:[{id:'r',kind:'principal',measuredM2:42,coefficient:1,weightedM2:42}]};return value;};
 it('shows the authorized server measurement and suspends it immediately during local geometry editing',async()=>{const api=port();api.plans.mockResolvedValue(measured());await loaded(api);expect(screen.getByRole('table',{name:'Dettaglio dei vani'})).toHaveTextContent('42 m²');dirtyGeometry();expect(screen.queryByText('42 m²')).not.toBeInTheDocument();expect(screen.getByText(/Geometrie o impostazioni in modifica/)).toBeInTheDocument();expect(api.edit).not.toHaveBeenCalled();});
 it.each([2,undefined])('does not show a report for a different or missing geometry revision (%s)',async revision=>{const api=port(),value=measured();value.plans[0]!.geometryRevision=revision;api.plans.mockResolvedValue(value);await loaded(api);expect(screen.queryByText('42 m²')).not.toBeInTheDocument();expect(screen.getByRole('table',{name:'Dettaglio dei vani'})).toHaveTextContent('Da calcolare');});
});

describe('paper-format calibration form',()=>{
 const paperProps=()=>({rooms:[structuredClone(shape)],hasPerimeter:false,rasterSize:{width:2100,height:2970},busy:false,onDirty:vi.fn(),requestPolygon:vi.fn(),requestSegment:vi.fn(),onSave:vi.fn<(c:MeasurementConfiguration)=>void>()});
 function fillCommercial(){fireEvent.change(screen.getByLabelText('Versione criterio adottato'),{target:{value:'synthetic-v1'}});fireEvent.change(screen.getByLabelText('Limite 25 cm del muro in comunione'),{target:{value:'physical_thickness'}});fireEvent.change(screen.getByLabelText('Categoria di Stanza'),{target:{value:'principal'}});}
 it('defaults to A4 and 1:100, saves assumption provenance without claiming a verified scale',()=>{const p=paperProps();render(<MeasurementForm {...p}/>);expect(screen.getByLabelText('Metodo di calibrazione')).toHaveValue('paper');expect(screen.getByLabelText('Formato foglio')).toHaveValue('A4');expect(screen.getByLabelText('Scala dichiarata · 1:')).toHaveValue(100);fillCommercial();fireEvent.submit(screen.getByRole('form',{name:'Calibrazione e computo'}));expect(p.onSave).toHaveBeenCalledOnce();expect(p.onSave.mock.calls[0]![0].calibration).toMatchObject({confirmed:false,metres:21,paper:{format:'A4',denominator:100,widthUnits:2100,heightUnits:2970}});});
 it('rejects an obviously cropped image rather than stretching it to A4',()=>{const p=paperProps();render(<MeasurementForm {...p} rasterSize={{width:1000,height:1000}}/>);fillCommercial();fireEvent.submit(screen.getByRole('form',{name:'Calibrazione e computo'}));expect(screen.getByRole('alert')).toHaveTextContent('Le proporzioni non corrispondono');expect(p.onSave).not.toHaveBeenCalled();});
 it('switching to a measured reference requires fresh endpoints and removes paper provenance',()=>{const p=paperProps();render(<MeasurementForm {...p}/>);fillScale();fireEvent.change(screen.getByLabelText('Categoria di Stanza'),{target:{value:'principal'}});fireEvent.submit(screen.getByRole('form',{name:'Calibrazione e computo'}));expect(p.onSave).toHaveBeenCalledOnce();expect(p.onSave.mock.calls[0]![0].calibration.paper).toBeUndefined();expect(p.onSave.mock.calls[0]![0].calibration.confirmed).toBe(true);});
});

it('unassigned areas are visible as review candidates, never silently inserted into canonical rooms',async()=>{const api=port(),v=plans(),p=v.plans[0]!;p.surfaceProposal={digest:'e'.repeat(64),state:'pending',baseGeometryRevision:1,rooms:[structuredClone(shape),{id:'candidate',label:'Area non censita da verificare',points:[[12,0],[16,0],[16,10],[12,10]],holes:[]}],issues:[{id:'candidate',code:'coverage_area_requires_review'}],summary:{doorArcs:0,serviceCells:0,exteriorStrips:0,unassignedAreas:1},coverage:{candidateIds:['candidate'],truncated:false}};api.plans.mockResolvedValue(v);await loaded(api);expect(screen.getByText(/Aree non censite da verificare: 1/)).toBeInTheDocument();expect(screen.queryByTestId('shape-candidate')).not.toBeInTheDocument();fireEvent.click(screen.getByRole('button',{name:'Confronta i contorni proposti'}));expect(screen.getByTestId('shape-candidate')).toHaveAttribute('fill','rgba(255,155,0,.2)');expect(screen.getByText(/Area individuata dai pixel/)).toBeInTheDocument();expect(api.edit).not.toHaveBeenCalled();});

it('an agent can discard one candidate, recheck the preview and persist the explicit choice without dropping known rooms',async()=>{const api=port(),v=plans(),p=v.plans[0]!,candidate={id:'candidate',label:'Area sottile',points:[[12,0],[16,0],[16,10],[12,10]] as [number,number][],holes:[]};p.surfaceProposal={digest:'f'.repeat(64),state:'pending',baseGeometryRevision:1,rooms:[structuredClone(shape),candidate],issues:[{id:'candidate',code:'coverage_area_requires_review'}],summary:{doorArcs:0,serviceCells:0,exteriorStrips:0,unassignedAreas:1},coverage:{candidateIds:['candidate'],possibleWallIds:['candidate'],truncated:false}};api.plans.mockResolvedValue(v);api.edit.mockImplementation(async(_id,body)=>{expect(body.command).toEqual({operation:'apply_surface_proposal',proposalDigest:'f'.repeat(64),excludedCandidateIds:['candidate']});const next=structuredClone(v);next.revision++;next.plans[0]!.version++;next.plans[0]!.surfaceProposal!.state='applied';next.plans[0]!.surfaceProposal!.acceptedExcludedCandidateIds=['candidate'];return{replay:false,plans:next};});await loaded(api);fireEvent.click(screen.getByRole('button',{name:'Confronta i contorni proposti'}));expect(screen.getByRole('checkbox',{name:'Scarta Area sottile'})).not.toBeChecked();expect(screen.getByText(/Possibile fascia muraria/)).toBeInTheDocument();fireEvent.change(screen.getByLabelText('Motivo della modifica o del computo'),{target:{value:'Fascia muraria verificata'}});fireEvent.click(screen.getByLabelText('Ho confrontato i contorni con l’originale'));fireEvent.click(screen.getByRole('checkbox',{name:'Scarta Area sottile'}));expect(screen.getByTestId('shape-candidate')).toHaveAttribute('stroke-dasharray','6 4');expect(screen.getByTestId('shape-r')).toBeInTheDocument();expect(screen.getByRole('button',{name:'Adotta i contorni proposti'})).toBeDisabled();expect(api.edit).not.toHaveBeenCalled();fireEvent.click(screen.getByLabelText('Ho confrontato i contorni con l’originale'));fireEvent.click(screen.getByRole('button',{name:'Adotta i contorni proposti'}));await screen.findByText(/Aree scartate: 1/);expect(screen.queryByTestId('shape-candidate')).not.toBeInTheDocument();expect(screen.getByTestId('shape-r')).toBeInTheDocument();});

it('removes a selected room only after confirmation and shows the returned geometry',async()=>{
 const api=port();
 api.edit.mockResolvedValue({replay:false,plans:{revision:5,plans:[{...plans().plans[0]!,version:2,rooms:[]}]}});
 render(<AgencyPracticePlanWorkspace api={api} scopeKey="a:g:p" embedded/>);
 await screen.findByRole('img',{name:'Contorni dei singoli vani'});
 fireEvent.click(screen.getByTestId('shape-r'));
 fireEvent.click(screen.getByRole('button',{name:'Elimina vano selezionato'}));
 expect(api.edit).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button',{name:'Annulla eliminazione'}));
 expect(screen.queryByRole('group',{name:'Conferma eliminazione vano'})).not.toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Elimina vano selezionato'}));
 fireEvent.click(screen.getByRole('button',{name:'Conferma eliminazione'}));
 await screen.findByText('Modifiche salvate nella pratica.');
 expect(api.edit.mock.calls[0]![1]).toMatchObject({expectedRevision:4,expectedPlanVersion:1,command:{operation:'remove_room',id:'r'}});
 expect(screen.queryByTestId('shape-r')).not.toBeInTheDocument();
});

it('simple drawing starts without vertices and saves through the visible toolbar using the protected edit request',async()=>{
 const api=port();render(<AgencyPracticePlanWorkspace api={api} scopeKey="simple" embedded/>);
 await screen.findByRole('img',{name:'Contorni dei singoli vani'});
 expect(screen.queryByRole('button',{name:'Vertice 1'})).not.toBeInTheDocument();
 expect(screen.getByRole('button',{name:'Salva modifiche'})).toBeDisabled();
 fireEvent.click(screen.getByRole('button',{name:'Seleziona vano Stanza'}));
 fireEvent.click(screen.getByRole('button',{name:'Aggiungi punto su un lato'}));
 fireEvent.click(screen.getByRole('button',{name:'Inserisci punto sul lato 1'}));
 expect(screen.getByRole('button',{name:'Salva modifiche'})).toBeEnabled();
 expect(screen.getByRole('button',{name:'Calcola superfici'})).toBeDisabled();
 fireEvent.click(screen.getByRole('button',{name:'Salva modifiche'}));
 await screen.findByText('Modifiche salvate nella pratica.');
 expect(api.edit).toHaveBeenCalledOnce();
 expect(api.edit.mock.calls[0]![1]).toMatchObject({expectedRevision:4,expectedPlanVersion:1,command:{operation:'geometry',view:'rooms',id:'r',geometry:{points:[[0,0],[5,0],[10,0],[10,10],[0,10]],holes:[]}}});
});

it('corrects the proposed gross outline on the calculation map and confirms it with the estimate in one save',async()=>{
 const api=port(),state=plans(),plan=state.plans[0]!;
 plan.perimeterProposal={points:[[0,0],[18,0],[18,18],[0,18]],holes:[]};
 api.plans.mockResolvedValue(state);
 api.edit.mockResolvedValueOnce({replay:false,plans:{revision:5,plans:[{...plan,version:2,mainPerimeter:{points:[[0,0],[9,0],[18,0],[18,18],[0,18]],holes:[]},quickEstimate:{savedAt:'2026-11-09T08:00:00.000Z',geometryRevision:2}}]}});
 render(<AgencyPracticePlanWorkspace api={api} scopeKey="gross-review" embedded/>);
 fireEvent.click(await screen.findByRole('button',{name:'Calcola superfici'}));
 expect(await screen.findByRole('img',{name:'Perimetro lordo e pertinenze'})).toBeInTheDocument();
 expect(screen.getByTestId('shape-gross')).toBeInTheDocument();
 expect(screen.getByTestId('context-r')).toBeInTheDocument();
 expect(screen.queryByRole('tab')).not.toBeInTheDocument();
 expect(screen.getByText(/Proposto da Dimora/)).toBeVisible();
 fireEvent.click(screen.getByRole('button',{name:'Seleziona vano Perimetro lordo proposto'}));
 fireEvent.click(screen.getByRole('button',{name:'Aggiungi punto su un lato'}));
 fireEvent.click(screen.getByRole('button',{name:'Inserisci punto sul lato 1'}));
 expect(screen.getByText('Perimetro modificato: premi Salva modifiche nella barra della mappa.')).toBeInTheDocument();
 expect(screen.getByRole('button',{name:'Modifica pianta'})).toBeDisabled();
 const save=screen.getByRole('button',{name:'Salva modifiche'});
 expect(screen.getByRole('group',{name:'Strumenti della mappa'})).toContainElement(save);
 expect(save).toBeEnabled();
 fireEvent.click(save);
 await screen.findByText('Stima salvata nella pratica.');
 expect(screen.getByRole('button',{name:'Modifica pianta'})).toBeEnabled();
 expect(screen.queryByRole('button',{name:'Salva modifiche'})).not.toBeInTheDocument();
 expect(api.edit).toHaveBeenCalledTimes(1);
 expect(api.edit.mock.calls[0]![1]).toMatchObject({expectedRevision:4,expectedPlanVersion:1,command:{operation:'save_quick_estimate',covers:[],outline:{view:'perimeter',id:'gross',geometry:{points:[[0,0],[9,0],[18,0],[18,18],[0,18]],holes:[]}}}});
 expect(screen.queryByText('Ambienti e superfici nette')).not.toBeInTheDocument();
});

it('opens the gross vertices from an overlap warning and clears it when the outlines separate',async()=>{
 const api=port(),state=plans(),plan=state.plans[0]!;
 plan.rasterSize={width:60,height:60};
 plan.rooms=[shape,{id:'b',label:'Balcone',kind:'balcony',points:[[10,0],[15,0],[15,10],[10,10]],holes:[]}];
 plan.mainPerimeter={points:[[0,0],[11,0],[11,10],[0,10]],holes:[]};
 api.plans.mockResolvedValue(state);
 render(<AgencyPracticePlanWorkspace api={api} scopeKey="review-overlap" embedded/>);
 fireEvent.click(await screen.findByRole('button',{name:'Mostra sulla mappa · Balcone'}));
 expect(screen.getByTestId('shape-b')).toHaveAttribute('data-selected','true');
 const correct=screen.getByRole('button',{name:'Correggi perimetro · Balcone'});
 fireEvent.click(correct);
 expect(screen.getByTestId('shape-gross')).toHaveAttribute('data-selected','true');
 fireEvent.keyDown(screen.getByRole('button',{name:'Vertice 2'}),{key:'ArrowLeft',shiftKey:true});
 expect(correct).toBeEnabled();
 fireEvent.click(correct);
 fireEvent.keyDown(screen.getByRole('button',{name:'Vertice 3'}),{key:'ArrowLeft',shiftKey:true});
 expect(screen.queryByText(/Rischio di doppio conteggio: Balcone/)).not.toBeInTheDocument();
 expect(screen.getByRole('button',{name:'Salva stima'})).toBeEnabled();
 expect(api.edit).not.toHaveBeenCalled();
});

it('adds cellar and balcony contours from the calculation and shows their weighted contributions',async()=>{
 const state=plans(),plan=state.plans[0]!;
 plan.rasterSize={width:60,height:60};
 plan.mainPerimeter={points:shape.points,holes:[]};
 plan.quickEstimate={scale:{mode:'manual',start:[0,0],end:[10,0],metres:10},savedAt:'2026-11-09T08:00:00.000Z',geometryRevision:1};
 const api={...port(),preview:vi.fn<NonNullable<AgencyPlanPort['preview']>>()};
 api.plans.mockResolvedValue(state);
 api.edit.mockImplementation(async(_id,{command})=>{
  const geometry=command.geometry as Pick<typeof shape,'points'|'holes'>;
  const next=state.plans[0]!;
  state.plans[0]={...next,version:next.version+1,geometryRevision:(next.geometryRevision??1)+1,rooms:[...next.rooms!,{id:String(command.id),label:String(command.label),kind:String(command.kind),...geometry}]};
  return {replay:false,plans:{...state,revision:++state.revision}};
 });
 render(<AgencyPracticePlanWorkspace api={api} scopeKey="add-estimate-areas" embedded/>);
 for(const [type,left] of [['cellar',12],['balcony',25]] as const){
  fireEvent.click(await screen.findByRole('button',{name:'Aggiungi area al calcolo'}));
  fireEvent.change(screen.getByLabelText('Tipo di area'),{target:{value:type}});
  fireEvent.click(screen.getByRole('button',{name:'Disegna contorno'}));
  fireEvent.click(screen.getByText('Coordinate (facoltative)'));
  for(const [x,y] of [[left,0],[left+5,0],[left+5,10],[left,10]]){
   fireEvent.change(screen.getByLabelText('Nuovo vertice X'),{target:{value:x}});
   fireEvent.change(screen.getByLabelText('Nuovo vertice Y'),{target:{value:y}});
   fireEvent.click(screen.getByRole('button',{name:'Aggiungi vertice'}));
  }
  fireEvent.click(screen.getByRole('button',{name:'Usa questo contorno'}));
  fireEvent.click(screen.getByRole('button',{name:'Aggiungi alla stima'}));
  await screen.findByRole('button',{name:type==='cellar'?'Cantina':'Balcone'});
 }
 expect(api.edit.mock.calls.map(([,body])=>body.command)).toMatchObject([
  {operation:'add_room',kind:'room',label:'Cantina'},
  {operation:'add_room',kind:'balcony',label:'Balcone'},
 ]);
 const summary=screen.getByRole('group',{name:'Stima della superficie commerciale'});
 expect(summary).toHaveTextContent('Totale stimato112,5 m²');
 expect(screen.getByRole('button',{name:'Salva stima'})).toBeEnabled();
 fireEvent.click(screen.getByRole('radio',{name:'Coperto'}));
 expect(summary).toHaveTextContent('Totale stimato130,0 m²');
});

it('points to the existing balcony when the drawn area duplicates it',async()=>{
 const state=plans(),plan=state.plans[0]!;
 plan.mainPerimeter={points:shape.points,holes:[]};
 plan.rooms=[shape,{id:'b',label:'Balcone esistente',kind:'balcony',points:[[12,0],[17,0],[17,10],[12,10]],holes:[]}];
 const api={...port(),preview:vi.fn<NonNullable<AgencyPlanPort['preview']>>()};
 api.plans.mockResolvedValue(state);
 render(<AgencyPracticePlanWorkspace api={api} scopeKey="duplicate-area" embedded/>);
 fireEvent.click(await screen.findByRole('button',{name:'Aggiungi area al calcolo'}));
 fireEvent.change(screen.getByLabelText('Tipo di area'),{target:{value:'balcony'}});
 fireEvent.click(screen.getByRole('button',{name:'Disegna contorno'}));
 fireEvent.click(screen.getByText('Coordinate (facoltative)'));
 for(const [x,y] of [[12,0],[17,0],[17,10],[12,10]]){
  fireEvent.change(screen.getByLabelText('Nuovo vertice X'),{target:{value:x}});
  fireEvent.change(screen.getByLabelText('Nuovo vertice Y'),{target:{value:y}});
  fireEvent.click(screen.getByRole('button',{name:'Aggiungi vertice'}));
 }
 fireEvent.click(screen.getByRole('button',{name:'Usa questo contorno'}));
 expect(screen.getByText(/Il nuovo contorno si sovrappone a «Balcone esistente»/)).toBeVisible();
 expect(screen.getByRole('button',{name:'Aggiungi alla stima'})).toBeDisabled();
 fireEvent.click(screen.getByRole('button',{name:'Usa «Balcone esistente» già presente'}));
 expect(screen.getByTestId('shape-b')).toHaveAttribute('data-selected','true');
 expect(api.preview).not.toHaveBeenCalled();
 expect(api.edit).not.toHaveBeenCalled();
});

it('opens a ready plan on the calculation, with saved balcony cover and sheet scale restored',async()=>{
 const api=port(),state=plans(),plan=state.plans[0]!;
 plan.rasterSize={width:210,height:297};
 plan.rooms=[{...shape},{id:'b',label:'Balcone',kind:'balcony',points:[[10,0],[30,0],[30,10],[10,10]],holes:[]}];
 plan.mainPerimeter={points:[[0,0],[10,0],[10,10],[0,10]],holes:[]};
 plan.balconyCovers=[{id:'b',cover:'uncovered'}];
 plan.quickEstimate={scale:{mode:'paper',format:'A4',denominator:100},savedAt:'2026-11-09T08:00:00.000Z',geometryRevision:1};
 api.plans.mockResolvedValue(state);
 render(<AgencyPracticePlanWorkspace api={api} scopeKey="reopen" embedded/>);
 expect(await screen.findByRole('img',{name:'Perimetro lordo e pertinenze'})).toBeInTheDocument();
 expect(screen.getByRole('button',{name:'Calcola superfici'})).toHaveAttribute('aria-pressed','true');
 expect(screen.getByRole('radio',{name:'Scoperto'})).toBeChecked();
 const summary=screen.getByRole('group',{name:'Stima della superficie commerciale'});
 expect(summary).toHaveTextContent('Scala 1:100 su foglio A4 intero');
 expect(summary).toHaveTextContent('AppartamentoPerimetro lordo1,0 m²');
 expect(summary).toHaveTextContent('Totale stimato1,5 m²');
 expect(screen.getByRole('button',{name:'Stima salvata'})).toBeDisabled();
});

it('keeps unsaved map changes visible, blocks switching task and can discard them',async()=>{
 const api=port();render(<AgencyPracticePlanWorkspace api={api} scopeKey="dirty" embedded/>);
 await screen.findByRole('img',{name:'Contorni dei singoli vani'});
 fireEvent.click(screen.getByRole('button',{name:'Seleziona vano Stanza'}));
 fireEvent.keyDown(screen.getByRole('button',{name:'Vertice 1'}),{key:'ArrowRight'});
 expect(screen.getByText('Modifiche da salvare: salva o scarta prima di cambiare attività.')).toBeVisible();
 expect(screen.getByRole('button',{name:'Calcola superfici'})).toBeDisabled();
 expect(screen.getByRole('button',{name:'Pianta per annuncio'})).toBeDisabled();
 fireEvent.click(screen.getByRole('button',{name:'Scarta modifiche'}));
 expect(screen.getByRole('button',{name:'Calcola superfici'})).toBeEnabled();
 expect(screen.getByTestId('shape-r')).toHaveAttribute('d','M0,0L10,0L10,10L0,10Z');
 expect(api.edit).not.toHaveBeenCalled();
});

it('prepares the listing image from saved outlines inside the page',async()=>{
 const api=port();render(<AgencyPracticePlanWorkspace api={api} scopeKey="listing" embedded/>);
 fireEvent.click(await screen.findByRole('button',{name:'Pianta per annuncio'}));
 const activities=screen.getByRole('group',{name:'Attività sulla planimetria'});
 const commands=await screen.findByRole('group',{name:'Comandi pianta per annuncio'});
 expect(activities.parentElement).toContainElement(commands);
 expect(commands).toContainElement(screen.getByRole('button',{name:'Modifica pianta per l’annuncio'}));
 expect(screen.getByText(/solo i contorni e i nomi dei vani salvati/)).toBeVisible();
 expect(screen.queryByRole('img',{name:'Contorni dei singoli vani'})).not.toBeInTheDocument();
});
