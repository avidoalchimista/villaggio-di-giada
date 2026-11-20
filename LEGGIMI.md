# Il villaggio di Giada

Regalo di Natale 2026. Specifica completa: `../CLAUDE gioco per giada.md`.

## Dove sta cosa

- `src/lib/analisi.ts` motore del diario (dizionario, negazioni, intensità, regole composte, segnali seri)
- `src/lib/gioco.ts` regole del villaggio (uova, crescita, mestieri, edifici, sonno, storia, tempo che passa)
- `src/dati/` tutti i testi, modificabili senza toccare il codice:
  `dizionario.json`, `questionario.json`, `frasi.json` (corvo, animali, conforto), `storia.json`, `regole.json` (numeri del gioco)
- `src/schermate/` le schermate; `src/componenti/` corvo e ritratti
- `public/img/<specie>_<fase>.webp` e `<specie>_<mestiere>.webp`: illustrazioni vere (se mancano, si vede il segnaposto)
- `public/audio/corvo/<id>.mp3`: battute del corvo registrate (id = chiavi di `frasi.json` → `corvo`)

## Comandi

Node è installato senza permessi di amministratore in
`%LOCALAPPDATA%\Programs\nodejs-portable\node-v26.13.1-win-x64` (non è nel PATH di sistema).

```powershell
$env:Path = "$env:LOCALAPPDATA\Programs\nodejs-portable\node-v26.13.1-win-x64;$env:Path"
npm test          # test del motore e della simulazione
npm run dev       # prova in locale
npm run build     # versione finale in dist/
```

## Funziona offline

Dopo la prima apertura con internet il service worker mette tutta l'app in cache: si apre e si usa senza rete.
I dati (diario, animali) stanno in IndexedDB sul telefono. Provato il 2026-11-20: con il server spento l'app si riapre.

## Modalità sviluppatore

Altro → toccare 7 volte la riga «versione» in fondo: +1/+7/+30 giorni, azzera tutto.
