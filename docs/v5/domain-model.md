# Modello V5 iniziale — identity-v1

Account, Session, Home, HomeMembership sono entità differenti. Session appartiene a Account; membership collega Account a Home con ruolo, permessi derivati e validità temporale. Home contiene nome/indirizzo/versione, non una scorciatoia di autorizzazione tramite ownerId.

Permessi valutati per azione e istante. Una membership scaduta o revocata resta come fatto storico, senza riabilitazione automatica all'avvio. Creare una nuova casa non modifica diritti della precedente. Orari server determinano scadenze; scheduler non è l'unica barriera agli accessi scaduti.

Prima verticale: account locali di sviluppo, più case per account, ruoli owner/member/viewer; register crea solo account, create Home crea una membership owner valida nella stessa transazione. Logout revoca sessione, non membership. Vendita/organizzazioni/mandati saranno contratti successivi, senza usare chiavi email/indirizzo come identità stabile.

Documenti futuri: StoredFile, DocumentVersion, Proposal/ProposedField, Confirmation/ReviewItem, AuditEvent. Documento confermato non equivale a certificazione tecnica. Non modellare tutte le verifiche con un unico flag sul documento. Nessuna tabella di documenti implementata o vincolata dal frontend iniziale.
