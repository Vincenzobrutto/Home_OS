import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

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
  },
})
