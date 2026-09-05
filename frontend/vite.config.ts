import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Prefissi delle rotte backend (vedi @Controller() dei moduli in
// backend/src) — auth/gmail/drive vivono già sotto /auth, /users,
// /houses. Proxiate qui così frontend e backend restano sulla stessa
// origin per il browser: dietro un tunnel pubblico (una sola porta
// esposta) il cookie di sessione httpOnly (SameSite=Lax) altrimenti non
// viaggerebbe verso un secondo dominio/porta per il backend.
const API_PREFIXES = [
  'assets',
  'auth',
  'contacts',
  'custom-fields',
  'documents',
  'genesis',
  'houses',
  'interventions',
  'maintenance-plans',
  'rooms',
  'timeline-events',
  'users',
  'warranties',
]

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // allowedHosts: true accetta qualunque hostname in arrivo (utile anche
    // per un eventuale tunnel, non solo per l'IP LAN sotto) — da restringere
    // se il progetto passa a un vero deploy.
    allowedHosts: true,
    // host: true fa ascoltare Vite su tutte le interfacce di rete (non solo
    // localhost), così l'app è raggiungibile anche da cellulare sulla
    // stessa rete Wi-Fi, all'IP LAN del PC (es. http://192.168.1.88:5173).
    host: true,
    proxy: Object.fromEntries(
      API_PREFIXES.map((prefix) => [
        `/${prefix}`,
        { target: 'http://localhost:3000', changeOrigin: true },
      ]),
    ),
  },
})
