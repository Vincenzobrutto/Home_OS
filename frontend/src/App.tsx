import { useEffect, useState } from 'react';
import { Menu } from 'lucide-react';
import { T, FONTS, MOBILE_CSS } from './theme';
import { api } from './api';
import type { Asset, Contact, ContactDetail as ContactDetailType, CustomField, DocumentRecord, House, Intervention, Room, User, Warranty } from './types';
import { Sidebar, type View } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { RoomDetail } from './components/Rooms';
import { RoomsHub } from './components/RoomsHub';
import { AssetsView, AssetDetail } from './components/Assets';
import { ContactsView, ContactDetailView } from './components/Contacts';
import { AddAssetModal, EditAssetModal, AddContactModal, EditContactModal } from './components/Modals';
import { InboxHub, type InboxTab } from './components/InboxHub';
import { BootstrapScreen } from './components/Bootstrap';
import { LoginScreen } from './components/LoginScreen';
import { HouseDocumentsView } from './components/HouseDocuments';
import { GenesisWizard } from './components/Genesis';
import { EnergyConsumption } from './components/EnergyConsumption';
import { PropertyProfile } from './components/PropertyProfile';
import { GlobalSearch } from './components/GlobalSearch';
import { ALPHA_MODE } from './config';

type AssetWithFields = Asset & { customFields: CustomField[] };

export default function App() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [needsBootstrap, setNeedsBootstrap] = useState(false);

  const [house, setHouse] = useState<House | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [assets, setAssets] = useState<AssetWithFields[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  // Caricati per la ricerca unificata (B49) — non altrimenti necessari a
  // livello App, ogni vista che li usava prima li caricava per conto suo.
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [warranties, setWarranties] = useState<Warranty[]>([]);
  const [interventions, setInterventions] = useState<Intervention[]>([]);

  const [view, setView] = useState<View>('dashboard');
  // Pannello sidebar a scomparsa sotto la soglia mobile (vedi MOBILE_CSS in
  // theme.ts) — su desktop resta semplicemente inutilizzato.
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  // Da dove è stato aperto l'asset-detail corrente, per far tornare "back"
  // alla pagina di origine invece che sempre alla griglia Asset — serve da
  // quando gli asset senza ambiente si aprono anche da Documenti casa.
  const [assetDetailOrigin, setAssetDetailOrigin] = useState<View>('assets');
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [addAssetOpen, setAddAssetOpen] = useState(false);
  const [addAssetRoomId, setAddAssetRoomId] = useState<string | null>(null);
  const [editAssetId, setEditAssetId] = useState<string | null>(null);
  const [contactDetail, setContactDetail] = useState<ContactDetailType | null>(null);
  const [addContactOpen, setAddContactOpen] = useState(false);
  const [editContactId, setEditContactId] = useState<string | null>(null);
  const [gmailCandidateCount, setGmailCandidateCount] = useState(0);
  const [gmailNotice, setGmailNotice] = useState<'connected' | 'error' | null>(null);
  const [driveCandidateCount, setDriveCandidateCount] = useState(0);
  const [driveNotice, setDriveNotice] = useState<'connected' | 'error' | null>(null);
  // Quale tab di InboxHub aprire al prossimo render — usato solo per il
  // deep-link di ritorno da un collegamento OAuth (vedi effect sotto).
  const [inboxInitialTab, setInboxInitialTab] = useState<InboxTab | undefined>(undefined);
  const [searchOpen, setSearchOpen] = useState(false);

  // Scorciatoia globale per la ricerca unificata (B49) — nessun listener da
  // tastiera esisteva prima in tutto il frontend.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  async function loadHouseData(houseId: string) {
    const [houseDetail, roomsData, assetsData, contactsData, documentsData, warrantiesData, interventionsData] = await Promise.all([
      api.houses.get(houseId),
      api.rooms.listForHouse(houseId),
      api.assets.listForHouse(houseId),
      api.contacts.listForHouse(houseId),
      api.documents.listForHouse(houseId),
      api.warranties.listForHouse(houseId),
      api.interventions.list(houseId),
    ]);
    setHouse(houseDetail);
    setRooms(roomsData);
    setAssets(assetsData);
    setContacts(contactsData);
    setDocuments(documentsData);
    setWarranties(warrantiesData);
    setInterventions(interventionsData);
    setGmailCandidateCount((await api.documents.gmailCandidates(houseId)).length);
    setDriveCandidateCount((await api.documents.driveCandidates(houseId)).length);
  }

  useEffect(() => {
    (async () => {
      try {
        const user = await api.auth.me();
        if (!user) {
          // Nessuna sessione valida: niente da caricare, LoginScreen prende
          // il controllo (vedi render sotto) finché l'utente non accede.
          setLoading(false);
          return;
        }
        setCurrentUser(user);
        const houses = await api.houses.mine();
        if (houses.length === 0) {
          setNeedsBootstrap(true);
          return;
        }
        await loadHouseData(houses[0].id);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Errore imprevisto');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleLogin(user: User) {
    setLoading(true);
    setError(null);
    setCurrentUser(user);
    try {
      const houses = await api.houses.mine();
      if (houses.length === 0) {
        setNeedsBootstrap(true);
      } else {
        await loadHouseData(houses[0].id);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore imprevisto');
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await api.auth.logout();
    setCurrentUser(null);
    setHouse(null);
    setNeedsBootstrap(false);
    setView('dashboard');
  }

  // Il redirect di ritorno da Google (auth/gmail|drive/callback) atterra qui
  // con ?gmail= o ?drive=connected|error: apriamo Inbox sul tab giusto e
  // ripuliamo l'URL così un refresh della pagina non ripete la stessa
  // navigazione.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const gmailResult = params.get('gmail');
    const driveResult = params.get('drive');
    if (gmailResult === 'connected' || gmailResult === 'error') {
      setView('inbox');
      setInboxInitialTab('gmail');
      setGmailNotice(gmailResult);
      window.history.replaceState({}, '', window.location.pathname);
    } else if (driveResult === 'connected' || driveResult === 'error') {
      setView('inbox');
      setInboxInitialTab('drive');
      setDriveNotice(driveResult);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  async function refreshGmailCandidateCount() {
    if (!house) return;
    setGmailCandidateCount((await api.documents.gmailCandidates(house.id)).length);
  }

  async function refreshDriveCandidateCount() {
    if (!house) return;
    setDriveCandidateCount((await api.documents.driveCandidates(house.id)).length);
  }

  function openAsset(id: string, origin: View = 'assets') {
    setSelectedAssetId(id);
    setAssetDetailOrigin(origin);
    setView('asset-detail');
  }
  function openRoom(id: string) {
    setSelectedRoomId(id);
    setView('room-detail');
  }
  function openAddAsset(roomId: string | null) {
    setAddAssetRoomId(roomId);
    setAddAssetOpen(true);
  }

  async function changeAssetRoom(assetId: string, roomId: string | null) {
    const updated = await api.assets.update(assetId, { roomId });
    setAssets((prev) => prev.map((a) => (a.id === assetId ? { ...a, ...updated } : a)));
  }

  async function refreshAssets() {
    if (!house) return;
    setAssets(await api.assets.listForHouse(house.id));
    // In alpha Home Detective non ha un bottone "Aggiorna" visibile (la
    // card Home Score è nascosta, vedi Dashboard.tsx) — il ricalcolo va
    // quindi silenzioso, così "Da tenere d'occhio" resta aggiornata dopo
    // ogni documento confermato senza un'azione esplicita dell'utente.
    if (ALPHA_MODE) {
      api.genesis.recalculateScore(house.id).catch(() => {});
    }
  }

  async function refreshRooms() {
    if (!house) return;
    setRooms(await api.rooms.listForHouse(house.id));
  }

  async function deleteRoom(room: Room) {
    if (!window.confirm(`Eliminare l'ambiente "${room.name}"? Gli eventuali asset collegati resteranno, ma senza ambiente assegnato.`)) {
      return;
    }
    await api.rooms.remove(room.id);
    setView('rooms');
    await refreshRooms();
    await refreshAssets();
  }

  async function deleteAsset(asset: Asset) {
    if (!window.confirm(`Eliminare definitivamente l'asset "${asset.name}"? L'operazione non è reversibile: i dati aggiuntivi e la cronologia collegati verranno eliminati. I documenti collegati resteranno, ma senza asset assegnato.`)) {
      return;
    }
    await api.assets.remove(asset.id);
    setView('assets');
    await refreshAssets();
  }

  async function dismissAsset(asset: Asset) {
    if (!window.confirm(`Dismettere l'asset "${asset.name}"? Uscirà dall'elenco degli asset attivi, ma tutti i suoi dati resteranno salvati.`)) {
      return;
    }
    await api.assets.dismiss(asset.id);
    await refreshAssets();
  }

  async function reactivateAsset(asset: Asset) {
    await api.assets.reactivate(asset.id);
    await refreshAssets();
  }

  async function refreshContacts() {
    if (!house) return;
    setContacts(await api.contacts.listForHouse(house.id));
  }

  async function openContact(id: string) {
    setView('contact-detail');
    setContactDetail(await api.contacts.get(id));
  }

  async function refreshContactDetail() {
    if (!contactDetail) return;
    setContactDetail(await api.contacts.get(contactDetail.id));
  }

  async function deleteContact(contact: Contact) {
    if (!window.confirm(`Eliminare il contatto "${contact.name}"? Gli eventuali interventi collegati resteranno, ma senza contatto assegnato.`)) {
      return;
    }
    await api.contacts.remove(contact.id);
    setView('contacts');
    setContactDetail(null);
    await refreshContacts();
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: T.paper, fontFamily: "'Inter', sans-serif", color: T.slate }}>
        Caricamento…
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: T.paper, fontFamily: "'Inter', sans-serif", color: T.rust, padding: 20, textAlign: 'center' }}>
        Impossibile contattare il backend ({import.meta.env.VITE_API_URL ?? 'http://localhost:3000'}).<br />
        {error}
      </div>
    );
  }

  if (!currentUser) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  if (needsBootstrap || !house) {
    return (
      <BootstrapScreen
        existingUser={currentUser}
        onReady={async (newHouse) => {
          setNeedsBootstrap(false);
          await loadHouseData(newHouse.id);
        }}
      />
    );
  }

  const selectedAsset = assets.find((a) => a.id === selectedAssetId);
  const selectedRoom = rooms.find((r) => r.id === selectedRoomId);
  const editAsset = assets.find((a) => a.id === editAssetId);
  const editContact =
    contacts.find((c) => c.id === editContactId) ??
    (contactDetail?.id === editContactId ? contactDetail : undefined);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: T.paper, fontFamily: "'Inter', sans-serif" }}>
      <style>{FONTS}{MOBILE_CSS}</style>
      {mobileNavOpen && (
        <div className={`app-sidebar-backdrop${mobileNavOpen ? ' open' : ''}`} onClick={() => setMobileNavOpen(false)} />
      )}
      <Sidebar
        view={view}
        setView={setView}
        house={house}
        gmailCandidateCount={gmailCandidateCount}
        driveCandidateCount={driveCandidateCount}
        assetDetailOrigin={assetDetailOrigin}
        open={mobileNavOpen}
        onNavigate={() => setMobileNavOpen(false)}
        onLogout={handleLogout}
        onOpenSearch={() => setSearchOpen(true)}
      />
      {searchOpen && (
        <GlobalSearch
          data={{ assets, contacts, documents, warranties, interventions }}
          onClose={() => setSearchOpen(false)}
          openAsset={(id) => openAsset(id, view)}
          openContact={openContact}
          onOpenHouseDocuments={() => setView('house-documents')}
        />
      )}
      <div className="app-content" style={{ flex: 1, minWidth: 0, overflowY: 'auto', overflowX: 'hidden' }}>
        <div className="app-topbar">
          <button className="app-menu-btn" onClick={() => setMobileNavOpen(true)} aria-label="Apri menu">
            <Menu size={18} />
          </button>
          <span className="app-topbar-title">{house.code}</span>
        </div>
        {view === 'dashboard' && (
          <Dashboard
            house={house}
            rooms={rooms}
            assets={assets}
            openAsset={(id) => openAsset(id, 'dashboard')}
            onOpenContact={openContact}
            onOpenGenesis={() => setView('genesis')}
            onOpenDocuments={() => setView('inbox')}
          />
        )}
        {view === 'genesis' && (
          <GenesisWizard
            house={house}
            onHouseChanged={setHouse}
            onGenesisCompleted={async () => {
              await loadHouseData(house.id);
            }}
            onExit={() => setView('dashboard')}
          />
        )}
        {view === 'energy' && (
          <EnergyConsumption
            house={house}
            openAsset={(id) => openAsset(id, 'energy')}
            openInbox={() => setView('inbox')}
          />
        )}
        {view === 'property-profile' && (
          <PropertyProfile house={house} onHouseChanged={setHouse} />
        )}
        {view === 'inbox' && (
          <InboxHub
            houseId={house.id}
            house={house}
            assets={assets}
            rooms={rooms}
            onAssetLinked={refreshAssets}
            onRoomsChanged={refreshRooms}
            onPropertyProfileChanged={() => loadHouseData(house.id)}
            gmailCandidateCount={gmailCandidateCount}
            driveCandidateCount={driveCandidateCount}
            onGmailCandidatesChanged={refreshGmailCandidateCount}
            onDriveCandidatesChanged={refreshDriveCandidateCount}
            initialTab={inboxInitialTab}
            gmailNotice={gmailNotice}
            onGmailNoticeShown={() => setGmailNotice(null)}
            driveNotice={driveNotice}
            onDriveNoticeShown={() => setDriveNotice(null)}
          />
        )}
        {view === 'house-documents' && (
          <HouseDocumentsView
            house={house}
            assets={assets}
            openAsset={(id) => openAsset(id, 'house-documents')}
            onAddAsset={() => openAddAsset(null)}
          />
        )}
        {view === 'rooms' && (
          <RoomsHub
            house={house}
            rooms={rooms}
            assets={assets}
            openRoom={openRoom}
            onRoomsChanged={refreshRooms}
            onAssetsChanged={refreshAssets}
            onHouseChanged={setHouse}
          />
        )}
        {view === 'room-detail' && selectedRoom && (
          <RoomDetail
            room={selectedRoom}
            assets={assets}
            back={() => setView('rooms')}
            openAsset={openAsset}
            onAddAsset={(roomId) => openAddAsset(roomId)}
            onDelete={deleteRoom}
          />
        )}
        {view === 'assets' && (
          <AssetsView
            house={house}
            // Gli asset senza ambiente (es. "Impianto elettrico") si
            // gestiscono solo da Documenti casa, non qui — vedi HouseDocuments.tsx.
            assets={assets.filter((a) => a.roomId)}
            rooms={rooms}
            openAsset={openAsset}
            onAddAsset={() => openAddAsset(null)}
            onReactivate={reactivateAsset}
          />
        )}
        {view === 'asset-detail' && selectedAsset && (
          <AssetDetail
            asset={selectedAsset}
            assets={assets}
            room={rooms.find((r) => r.id === selectedAsset.roomId)}
            rooms={rooms}
            contacts={contacts}
            back={() => setView(assetDetailOrigin)}
            openRoom={openRoom}
            openContact={openContact}
            onChangeRoom={changeAssetRoom}
            onEdit={() => setEditAssetId(selectedAsset.id)}
            onDelete={deleteAsset}
            onDismiss={dismissAsset}
            onReactivate={reactivateAsset}
            onContactsChanged={refreshContacts}
          />
        )}
        {view === 'asset-detail' && !selectedAsset && (
          <div style={{ padding: 44, fontFamily: "'Inter', sans-serif", color: T.slate }}>
            Asset non trovato.{' '}
            <button onClick={() => setView('assets')} style={{ color: T.pine, background: 'none', border: 'none', cursor: 'pointer' }}>
              Torna agli asset
            </button>
          </div>
        )}
        {view === 'contacts' && (
          <ContactsView house={house} contacts={contacts} openContact={openContact} onAddContact={() => setAddContactOpen(true)} />
        )}
        {view === 'contact-detail' && contactDetail && (
          <ContactDetailView
            contact={contactDetail}
            back={() => setView('contacts')}
            openAsset={openAsset}
            onEdit={() => setEditContactId(contactDetail.id)}
            onDelete={() => deleteContact(contactDetail)}
          />
        )}
        {view === 'contact-detail' && !contactDetail && (
          <div style={{ padding: 44, fontFamily: "'Inter', sans-serif", color: T.slate }}>Caricamento…</div>
        )}
      </div>

      {addAssetOpen && (
        <AddAssetModal
          houseId={house.id}
          rooms={rooms}
          defaultRoomId={addAssetRoomId}
          onCreated={async () => {
            setAddAssetOpen(false);
            await refreshAssets();
          }}
          onClose={() => setAddAssetOpen(false)}
        />
      )}
      {editAsset && (
        <EditAssetModal
          asset={editAsset}
          onSaved={async () => {
            setEditAssetId(null);
            await refreshAssets();
          }}
          onClose={() => setEditAssetId(null)}
        />
      )}
      {addContactOpen && (
        <AddContactModal
          houseId={house.id}
          onCreated={async () => {
            setAddContactOpen(false);
            await refreshContacts();
          }}
          onClose={() => setAddContactOpen(false)}
        />
      )}
      {editContact && (
        <EditContactModal
          contact={editContact}
          onSaved={async () => {
            setEditContactId(null);
            await refreshContacts();
            await refreshContactDetail();
          }}
          onClose={() => setEditContactId(null)}
        />
      )}
    </div>
  );
}
