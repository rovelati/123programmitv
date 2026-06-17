/**
 * Cloudflare Pages Function — /programma/*
 *
 * Restituisce 410 Gone per segnalare a Google la rimozione permanente
 * delle schede programma legacy. Senza noindex: Googlebot può crawlare
 * l'URL, vedere il 410 e rimuoverlo dall'indice.
 */
export async function onRequest() {
  return new Response(
    '<!DOCTYPE html><html lang="it"><head><meta charset="UTF-8"><title>Pagina non disponibile</title></head><body><h1>410 — Pagina non disponibile</h1><p>Questa scheda programma non è più disponibile. <a href="/">Torna alla guida TV</a>.</p></body></html>',
    {
      status: 410,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=86400',
      },
    },
  );
}
