import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { List } from '@phosphor-icons/react/dist/csr/List';
import { lockModalScroll } from './modalScroll';
import { Link, useLocation } from 'react-router';
import type { Account, Home } from '../api/types';
import { useLogout } from '../session/hooks';
import { Icon, type IconName } from './Icon';
import { Banner, cx } from './ui';
import styles from './AppShell.module.css';
import { EmailVerificationNotice } from './EmailVerificationNotice';
import { contactNavigationState } from '../contacts/navigation';
import { useTrash } from '../documents/trash';
import trashStyles from '../documents/trash.module.css';

export type SectionId = 'casa' | 'oggetti' | 'ambienti' | 'attivita' | 'documenti' | 'spese' | 'rubrica';

export const SECTIONS: Array<{ id: SectionId; label: string; icon: IconName; available: boolean }> = [
  { id: 'casa', label: 'Casa', icon: 'home', available: true },
  { id: 'oggetti', label: 'Oggetti e impianti', icon: 'objects', available: true },
  { id: 'ambienti', label: 'Ambienti', icon: 'rooms', available: true },
  { id: 'attivita', label: 'Attività', icon: 'activity', available: true },
  { id: 'documenti', label: 'Documenti', icon: 'document', available: true },
  { id: 'spese', label: 'Spese', icon: 'expenses', available: true },
  { id: 'rubrica', label: 'Rubrica', icon: 'contacts', available: true },
];


export function Brand() {
  return (
    <span className={styles.brand}>
      Dimora<span>.</span>
    </span>
  );
}

export function PublicShell({ children }: { children: ReactNode }) {
  return (
    <div className={styles.app}>
      <a className={styles.skip} href="#main">
        Vai al contenuto
      </a>
      <header className={styles.top}>
        <Brand />
      </header>
      <div className={styles.layout}>
        <main id="main" className={styles.main} tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );
}

export function AppShell(props: { account: Account; home?: Home; children: ReactNode }) {
  const logout = useLogout();
  const { home } = props;
  const location = useLocation(), menuId = useId();
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const menuKey = home ? props.account.id + ':' + home.id + ':' + location.key : '';
  const menuOpen = !!home && menuFor === menuKey;
  const closeMenu = useCallback(() => setMenuFor(null), []);
  return (
    <div className={styles.app}>
      <a className={styles.skip} href="#main">
        Vai al contenuto
      </a>
      <header className={styles.top}>
        {home&&<button type="button" className={styles.mobileMenuButton} aria-haspopup="dialog" aria-expanded={menuOpen} aria-controls={menuOpen?menuId:undefined} onClick={()=>setMenuFor(menuKey)}><List size={20} aria-hidden="true"/>Menu</button>}
        <Link to="/case" className={styles.brand} aria-label="Dimora, le mie case">
          Dimora<span>.</span>
        </Link>
        <div className={styles.account}>
          <Link to="/agenzie" aria-label="Area Agenzie" className={styles.logout}><Icon name="document"/><span className={styles.logoutLabel}>Agenzie</span></Link>
          {/* Documenti ricevuti: livello account, raggiungibile anche senza case; non è una sezione della casa. */}
          <Link to="/consegne" className={styles.logout}>
            <Icon name="document" />
            <span className={styles.logoutLabel}>Documenti ricevuti</span>
          </Link>
          <span className={styles.accountName} title={props.account.email}>
            {props.account.name}
          </span>
          <button
            type="button"
            className={styles.logout}
            onClick={() => logout.mutate()}
            disabled={logout.isPending}
            aria-label={logout.isPending ? 'Uscita in corso' : `Esci dall’account ${props.account.name}`}
          >
            <Icon name="logout" />
            <span className={styles.logoutLabel}>{logout.isPending ? 'Uscita…' : 'Esci'}</span>
          </button>
        </div>
      </header>
      <div className={cx(styles.layout, home && styles.withSide)}>
        {home && (
          <aside className={styles.side}>
            <span className={styles.sideTitle} id="side-title">
              La tua casa
            </span>
            <SectionNav home={home} accountId={props.account.id} variant="side" />
            <TrashLink home={home} accountId={props.account.id} />
            <div className={styles.sideFooter}>
              <strong>{home.name}</strong>
              <Link to="/case">Cambia casa</Link>
            </div>
          </aside>
        )}
        <main id="main" className={styles.main} tabIndex={-1}>
          <div className={styles.mainStack}>
            {logout.isError && (
              <Banner tone="error" role="alert" title="Uscita non completata">
                <p>Il servizio non ha confermato l’uscita: la sessione potrebbe essere ancora attiva. Riprova.</p>
              </Banner>
            )}
            <div>{props.children}</div>
            <EmailVerificationNotice key={props.account.id} />
          </div>
        </main>
      </div>
      {home&&menuOpen&&<MobileSectionMenu id={menuId} home={home} accountId={props.account.id} onClose={closeMenu}/> }
      {home && <SectionNav home={home} accountId={props.account.id} variant="bottom" />}
    </div>
  );
}

function SectionNav({ home, accountId, variant, onNavigate }: { home: Home; accountId: string; variant: 'side' | 'bottom' | 'menu'; onNavigate?:()=>void }) {
  const location = useLocation();
  const { pathname } = location;
  const section = pathname.split('/')[3];
  const activeSection =
    section === 'review' || section === 'impianti' ? 'attivita' : variant === 'bottom' && (section === 'ambienti' || section === 'oggetti') ? 'casa' : section;
  const linkClass = variant === 'bottom' ? styles.bottomLink : styles.sideLink;
  return (
    <nav
      className={variant === 'bottom' ? styles.bottomNav : styles.sideNav}
      aria-label={`${variant==='menu'?'Menu sezioni':'Sezioni'} di ${home.name}`}
    >
      {SECTIONS.filter(s=>variant!=='bottom'||!['oggetti','ambienti'].includes(s.id)).map((s) => (
        <Link
          key={s.id}
          onClick={onNavigate}
          to={`/home/${encodeURIComponent(home.id)}/${s.id}`}
          state={s.id === 'rubrica' ? section === 'rubrica' ? location.state : contactNavigationState(accountId, home.id, location) : undefined}
          className={cx(linkClass, !s.available && styles.unavailableLink)}
          aria-current={activeSection === s.id ? 'page' : undefined}
        >
          <Icon name={s.icon} />
          <span>{s.label}</span>
          {!s.available && (
            <>
              <span className={variant === 'side' ? styles.soon : styles.soonBottom} aria-hidden="true">
                <Icon name="lock" />
              </span>
              <span className="visually-hidden"> (non ancora disponibile)</span>
            </>
          )}
        </Link>
      ))}
    </nav>
  );
}

/** Discreet entry: shown only when the caller's own trash is not empty; never in the bottom bar. */
function TrashLink({ home, accountId, onNavigate }: { home: Home; accountId: string; onNavigate?: () => void }) {
  const trash = useTrash(accountId, home.id), items = trash.data?.items, count = Array.isArray(items) ? items.length : 0;
  if (!count) return null;
  return <Link to={`/home/${encodeURIComponent(home.id)}/cestino`} onClick={onNavigate} className={trashStyles.sideLink}>Cestino ({count})</Link>;
}

function MobileSectionMenu({id,home,accountId,onClose}:{id:string;home:Home;accountId:string;onClose:()=>void}){
 const panel=useRef<HTMLDivElement>(null),title=useId();
 useEffect(()=>{
  const trigger=document.activeElement as HTMLElement|null,root=document.getElementById('root'),previousInert=root?.inert,unlock=lockModalScroll();
  if(root)root.inert=true;
  panel.current?.querySelector<HTMLButtonElement>('button')?.focus();
  const key=(event:KeyboardEvent)=>{
   if(event.key==='Escape'){event.preventDefault();onClose();return;}
   if(event.key!=='Tab')return;
   const controls=Array.from(panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href]')??[]),first=controls[0],last=controls.at(-1);
   if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
   else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
  };
  const wide=typeof window.matchMedia==='function'?window.matchMedia('(min-width: 801px)'):undefined;
  const resize=()=>{if(wide?.matches)onClose();};
  document.addEventListener('keydown',key);wide?.addEventListener('change',resize);
  return()=>{document.removeEventListener('keydown',key);wide?.removeEventListener('change',resize);unlock();if(root)root.inert=previousInert??false;if(trigger?.isConnected)trigger.focus();};
 },[onClose]);
 return createPortal(<div className={styles.menuBackdrop} onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
  <div ref={panel} id={id} role="dialog" aria-modal="true" aria-labelledby={title} className={styles.menuPanel}>
   <header className={styles.menuHeader}><h2 id={title}>Menu</h2><button type="button" className={styles.logout} onClick={onClose}>Chiudi menu</button></header>
   <p className={styles.menuHome}>{home.name}</p>
   <SectionNav home={home} accountId={accountId} variant="menu" onNavigate={onClose}/>
   <TrashLink home={home} accountId={accountId} onNavigate={onClose}/>
  </div>
 </div>,document.body);
}
