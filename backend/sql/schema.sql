-- HomeOS — schema SQL (PostgreSQL)
-- Equivalente diretto di prisma/schema.prisma — utile come riferimento
-- indipendente dall'ORM, o se in futuro si cambia stack.

CREATE EXTENSION IF NOT EXISTS "pgcrypto"; -- per gen_random_uuid()

CREATE TYPE room_type AS ENUM ('CUCINA', 'SOGGIORNO', 'CAMERA', 'BAGNO');

CREATE TYPE asset_type AS ENUM (
  'CALDAIA', 'ELETTRICO', 'IDRAULICO', 'FOTOVOLTAICO',
  'CLIMA', 'TETTO', 'FINESTRE', 'ELETTRODOMESTICO'
);

-- Calcolato dall'applicazione (garanzie scadute, documenti mancanti),
-- non impostato manualmente dall'utente — vedi §6 dell'architettura.
CREATE TYPE asset_status AS ENUM ('OK', 'ATTENTION', 'DUE');

CREATE TYPE field_source AS ENUM ('MANUAL', 'AI_EXTRACTED');

CREATE TYPE document_status AS ENUM ('PENDING', 'ANALYZING', 'ANALYZED', 'CONFIRMED');

CREATE TYPE membership_role AS ENUM ('OWNER', 'MEMBER', 'VIEWER');

-- ---------------------------------------------------------------------------

CREATE TABLE users (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email      text UNIQUE NOT NULL,
  name       text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE houses (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id    uuid NOT NULL REFERENCES users(id),
  name        text NOT NULL,
  city        text,
  surface_sqm numeric,
  rooms_count integer,
  build_year  integer,
  code        text UNIQUE NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Predisposta fin dall'MVP anche se oggi ogni casa ha un solo proprietario:
-- evita una migrazione dolorosa quando arriverà la condivisione (coniuge,
-- amministratore di condominio, artigiano) — vedi §3 dell'architettura.
CREATE TABLE house_memberships (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  house_id   uuid NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES users(id),
  role       membership_role NOT NULL DEFAULT 'OWNER',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (house_id, user_id)
);

CREATE TABLE rooms (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  house_id      uuid NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
  type          room_type NOT NULL,
  name          text NOT NULL,
  code          text UNIQUE NOT NULL,
  -- Coordinate reali della stanza quando disponibili da una planimetria vera
  -- (nel prototipo è solo una griglia generata). Nullable finché non c'è.
  plan_geometry jsonb
);

CREATE TABLE assets (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  house_id       uuid NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
  -- null = impianto di casa, non legato a una stanza specifica
  room_id        uuid REFERENCES rooms(id) ON DELETE SET NULL,
  type           asset_type NOT NULL,
  name           text NOT NULL,
  code           text UNIQUE NOT NULL,
  installed_at   date,
  warranty_until date,
  status         asset_status NOT NULL DEFAULT 'ATTENTION',
  -- Posizione relativa (0–1) nella cella della planimetria generata
  plan_pos_x     numeric,
  plan_pos_y     numeric,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE asset_custom_fields (
  id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  label    text NOT NULL,
  value    text NOT NULL,
  source   field_source NOT NULL DEFAULT 'MANUAL'
);

CREATE TABLE documents (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Nullable finché il documento è in Inbox e non ancora confermato/associato
  asset_id          uuid REFERENCES assets(id) ON DELETE SET NULL,
  house_id          uuid NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
  file_url          text NOT NULL,
  original_filename text NOT NULL,
  doc_type          text,
  status            document_status NOT NULL DEFAULT 'PENDING',
  ai_confidence     numeric,
  -- Risultato grezzo dell'estrazione, prima della conferma utente —
  -- l'AI non scrive mai direttamente su assets/asset_custom_fields (vedi §5).
  extracted_fields  jsonb,
  uploaded_at       timestamptz NOT NULL DEFAULT now(),
  confirmed_at      timestamptz,
  -- true solo se confermato esplicitamente come "collega alla casa, non a un
  -- asset specifico" (es. APE, certificazione energetica generale) — non va
  -- dedotto da asset_id nullo, perché un asset cancellato lascia asset_id
  -- null anche sui documenti già confermati (ON DELETE SET NULL sopra).
  house_level       boolean NOT NULL DEFAULT false
);

-- Rubrica: tecnici/aziende che hanno lavorato in casa. Collegamento
-- all'intervento manuale (l'utente sceglie il contatto), niente
-- auto-popolamento da AI per l'MVP.
CREATE TABLE contacts (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  house_id   uuid NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
  name       text NOT NULL,
  role       text,
  phone      text,
  email      text,
  notes      text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE asset_timeline_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id    uuid NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  event_date  date NOT NULL,
  event_type  text NOT NULL,
  detail      text,
  document_id uuid REFERENCES documents(id) ON DELETE SET NULL,
  contact_id  uuid REFERENCES contacts(id) ON DELETE SET NULL
);

-- Indici sulle foreign key più interrogate (Postgres non li crea da solo)
CREATE INDEX idx_rooms_house_id ON rooms(house_id);
CREATE INDEX idx_assets_house_id ON assets(house_id);
CREATE INDEX idx_assets_room_id ON assets(room_id);
CREATE INDEX idx_documents_house_id ON documents(house_id);
CREATE INDEX idx_documents_asset_id ON documents(asset_id);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_timeline_asset_id ON asset_timeline_events(asset_id);
CREATE INDEX idx_timeline_contact_id ON asset_timeline_events(contact_id);
CREATE INDEX idx_custom_fields_asset_id ON asset_custom_fields(asset_id);
CREATE INDEX idx_contacts_house_id ON contacts(house_id);
