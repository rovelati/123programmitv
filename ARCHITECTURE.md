# Architettura — intvstasera.it

Stack di produzione unico, senza dipendenze da servizi legacy.

## Panoramica

```
TVIT + RaiPlay + IPTV-EPG
         │
         ▼
  EPG import (Python)
  Contabo VPS — Postgres locale
         │
         ▼
  Astro SSG build (Node 22)
  Contabo VPS
         │
         ▼
  Cloudflare Pages
  www.intvstasera.it
```

## Componenti

| Componente | Dove | Ruolo |
|------------|------|--------|
| **Postgres** | Contabo VPS (`127.0.0.1`) | DB canali/programmi EPG |
| **EPG import** | `scripts/epg/` + `scripts/run-epg-import.sh` | Import notturno e pre-build |
| **Astro build** | `scripts/rebuild-and-deploy-vps.sh` | SSG da Postgres |
| **Cloudflare Pages** | progetto `123programmitv` | CDN + HTTPS live |
| **GitHub Actions** | `.github/workflows/deploy.yml` | rsync codice → Contabo → rebuild |

## Flusso deploy

1. **Push su `main`** (o `workflow_dispatch`) → GitHub Actions
2. **rsync** del repo su `/var/www/123programmitv.it/astro/` (Contabo)
3. **`run-epg-import.sh`** → scrive in Postgres locale (fallback RaiPlay per Rai)
4. **`npm run build:node`** → legge Postgres via `DATABASE_URL`
5. **`wrangler pages deploy`** → Cloudflare Pages
6. **`notify-indexing.js`** → Google Indexing API (hub URL)

## Cron Contabo (consigliato)

```cron
# Import EPG ~01:00 Europe/Rome
0 1 * * * cd /var/www/123programmitv.it/astro && bash scripts/run-epg-import.sh >> /var/log/programmitv-epg-import.log 2>&1

# Rebuild + deploy ~02:15 (dopo import)
15 2 * * * bash /var/www/123programmitv.it/astro/scripts/rebuild-and-deploy-vps.sh
```

## Variabili d'ambiente (Contabo `.env`)

Vedi `.env.example`. Obbligatorie in produzione:

- `DATABASE_URL` — Postgres locale
- `CF_API_KEY`, `CF_API_EMAIL` — deploy Pages
- `GOOGLE_SA_KEY_FILE` — Indexing API (opzionale ma consigliato)

## GitHub Secrets

- `CONTABO_HOST`, `CONTABO_SSH_KEY` — sync e rebuild remoto
- `SITE_URL` — `https://www.intvstasera.it`

Non servono credenziali cloud DB esterne: tutto gira su Contabo.

## Dominio

- **Live**: `https://www.intvstasera.it`
- **Legacy**: `123programmitv.it` → redirect 301 verso intvstasera.it
