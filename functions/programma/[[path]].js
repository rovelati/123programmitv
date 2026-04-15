/**
 * Cloudflare Pages Function — /programma/*
 *
 * Le schede programma non esistono come pagine statiche (build SSG).
 * Restituisce 410 Gone invece di lasciare che Cloudflare Pages serva
 * la home (200) come fallback, evitando che Google associ queste URL
 * alla home page e sprecandone il crawl budget.
 *
 * Il robots.txt ha già "Disallow: /programma/" per bloccare il crawling.
 * Il 410 (a differenza del 404) segnala a Google che l'URL è rimosso
 * definitivamente e velocizza la de-indicizzazione.
 */
export async function onRequest() {
  return new Response(
    '<!DOCTYPE html><html lang="it"><head><meta charset="UTF-8"><title>Pagina non disponibile</title></head><body><h1>410 — Pagina non disponibile</h1><p>Questa scheda programma non è più disponibile. <a href="/">Torna alla guida TV</a>.</p></body></html>',
    {
      status: 410,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'X-Robots-Tag': 'noindex',
        'Cache-Control': 'public, max-age=86400',
      },
    },
  );
}
