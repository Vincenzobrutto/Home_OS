import {ui} from './ui';
export type InstallmentKind='single'|'deposit'|'balance';
const names={deposit:'Acconto',balance:'Saldo'};
export function installmentTitle(title:string){const match=/^(Acconto|Saldo) · (.*)$/s.exec(title);return {kind:(match?match[1]==='Acconto'?'deposit':'balance':'single') as InstallmentKind,description:match?match[2]!:title};}
export function withInstallment(title:string,kind:InstallmentKind){const base=installmentTitle(title).description;return kind==='single'?base:names[kind]+' · '+base;}
/** The explicit installment label is part of the ordinary, searchable title. No payment status is inferred. */
export function ExpenseInstallmentFields({title,onChange,disabled=false,reconcilePurchase=false}:{title:string;onChange:(title:string)=>void;disabled?:boolean;reconcilePurchase?:boolean}){
 const {kind}=installmentTitle(title);
 return <div className={ui.field}><label className={ui.label}>Questa spesa è<select className={ui.input} value={kind} disabled={disabled} onChange={e=>onChange(withInstallment(title,e.target.value as InstallmentKind))}><option value="single">Un importo unico</option><option value="deposit">Un acconto</option><option value="balance">Il saldo</option></select></label>
  {kind!=='single'&&<p className={ui.hint}>{reconcilePurchase?'Collega acconto e saldo alle stesse schede e conferma un solo costo complessivo. Se l’importo è ambiguo, lascialo in sospeso.':kind==='balance'?'Registra solo il saldo residuo, senza sommare di nuovo gli acconti già registrati.':'Registra solo questo acconto. Il saldo sarà una spesa distinta, collegata allo stesso oggetto o impianto.'} L’etichetta è conservata nel titolo; non attesta il pagamento.</p>}
 </div>;
}
