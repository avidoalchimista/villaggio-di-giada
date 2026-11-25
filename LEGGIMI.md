# Il villaggio di Giada

Regalo di Natale 2026. Specifica completa: `../CLAUDE gioco per giada.md`.

## Dove sta cosa

- `src/lib/analisi.ts` motore del diario (dizionario, negazioni, intensità, regole composte, segnali seri)
- `src/lib/gioco.ts` regole del villaggio (uova, crescita, mestieri, edifici, sonno, storia, tempo che passa)
- `src/lib/biomi.ts` i posti lontani (montagne di neve, mare, fiume, ciliegi, oasi, isola dei coralli): il castoro ne scopre il sentiero ogni 1-2 mesi
  (il primo 25-35 giorni dopo il suo arrivo); `src/scena/sentieri3d.ts` il sentiero nel bosco, il portale col nome e il paesaggio in fondo
- `src/lib/acquario.ts` l'acquario (costruzione da 100 castagne, dopo il laghetto): i pesci pescati ci finiscono dentro, quelli dei posti lontani si comprano;
  `src/scena/acquario3d.ts` l'edificio con la vasca e i pesci che nuotano
- `src/lib/funghi.ts` i funghi: Giada manda un animale nel bosco (bottone 🍄), sta via 12-20 minuti (o fino al giorno dopo) e torna con funghi veri
  della stagione (22 specie, alcune rare, alcune velenose). Si cucinano (da Giada o da un animale cuoco, che guadagna castagne) o si portano al museo
- `src/lib/museo.ts` il museo (costruzione da 80 castagne): ogni giorno nel villaggio brilla per terra una cosa da trovare (23 ritrovamenti),
  più la sala dei funghi. Ogni pezzo nuovo porta castagne di biglietti. `src/scena/museo3d.ts` l'edificio, la cosa che brilla e i funghi in 3D
- `src/lib/escursioni.ts` le escursioni: dopo una giornata particolare (triste, paura, rabbia, stanca, felice) Giada può andare
  in un posto scoperto con l'animale del cuore; la gente del posto e cosa dice per ogni giornata. `src/scena/gita3d.ts` la gita vista nel villaggio;
  `src/componenti/Escursione.svelte` la scelta e il racconto
- `src/lib/minigiochi.ts` i minigiochi delle botteghe («🤝 Dai una mano» toccando un animale con quel mestiere, o dentro la sua casa):
  spacca la legna (taglialegna), decora la torta (pasticcere), il tornio (vasaio), foto ricordo (fotografo), unisci le stelle (astronomo),
  giro in moto (motociclista). Da 1 a 5 castagne a partita, solo le prime 3 partite del giorno per bottega. Le cose fatte restano:
  vasi sulla mensola e torta sul tavolo in casa (`scena/interno.ts`), foto nell'album del diario, costellazioni nel cielo di notte (`scena/cielo.ts`).
  Ogni gioco ha la sua piccola scena 3D in `src/scena/minigiochi/` (il villaggio intanto si ferma); `src/componenti/Minigioco.svelte` è la cornice
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

## Online

https://avidoalchimista.github.io/villaggio-di-giada/ — ogni modifica caricata su `main` rifà i test e ripubblica da sola
(`.github/workflows/pages.yml`). I dati di chi la usa restano sul suo telefono: il telefono di Giada parte da zero.

## Funziona offline

Dopo la prima apertura con internet il service worker mette tutta l'app in cache: si apre e si usa senza rete.
I dati (diario, animali) stanno in IndexedDB sul telefono. Provato il 2026-11-20: con il server spento l'app si riapre.

## Modalità prova (solo per il telefono di prova)

Giada non può aprirla per caso: non c'è più nessun tocco segreto, si usano due indirizzi.

- `https://avidoalchimista.github.io/villaggio-di-giada/?prova` accende il pannello prove in fondo ad Altro
  (+1/+7/+30 giorni, +7/+30/+90/+365 giorni con diario finto per vedere gli sviluppi, fai crescere tutti, +100 castagne, azzera tutto). Resta acceso su quel telefono finché
  non premi «Nascondi questo pannello» o azzeri.
- Nel pannello prove c'è anche «🎂 Prova la festa di compleanno»: fa vedere subito la festa di paese del 24 luglio
  (vedi `src/lib/festa.ts` e `src/scena/festa.ts`). Il vero giorno la festa parte da sola appena Giada apre il gioco;
  se quel giorno non passa, la torta la aspetta fino al 27 luglio.
- Nel pannello prove ci sono «🍄 Fai tornare dai funghi» (chi è nel bosco torna subito) e «✨ Nuova cosa da trovare».
- Nel pannello prove ci sono i sei minigiochi delle botteghe: si aprono subito, anche se nel villaggio quel mestiere non c'è ancora.
- Nel pannello prove c'è «🦫 Trova un sentiero»: il castoro trova subito il prossimo posto lontano (serve che sia già arrivato, dopo 10 giorni).
- `https://avidoalchimista.github.io/villaggio-di-giada/?azzera` chiede conferma e cancella tutto da quel telefono:
  villaggio, diario, giorni simulati e pannello prove. Il gioco riparte dall'inizio.

Se il gioco è installato sulla schermata home: su Android apri questi indirizzi in Chrome, i dati sono gli stessi dell'app.
Su iPhone l'app sulla home ha dati suoi, separati da Safari: per ripartire da zero toglila dalla home e rimettila.
