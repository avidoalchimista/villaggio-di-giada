// "Come si gioca": le pagine che il corvo mostra a Giada dopo l'intro e quando tocca "?".
// Le stesse pagine tornano come "Lo sapevi?" nei primi giorni, una al giorno.

export interface PaginaGuida { icona: string; titolo: string; testo: string }

export const GUIDA: PaginaGuida[] = [
  {
    icona: '📖',
    titolo: 'Il diario',
    testo: "Quando vuoi, racconta com'è andata la giornata. Bastano poche righe. Tocca «Scrivi nel diario» o il quaderno nel prato.",
  },
  {
    icona: '🪶',
    titolo: 'Io leggo con te',
    testo: 'Dopo che hai scritto, ti mostro cosa ho trovato nella tua pagina: coraggio, gentilezza, curiosità… Se mi sbaglio, togli o aggiungi pure.',
  },
  {
    icona: '🥚',
    titolo: 'Le uova',
    testo: 'Le tue pagine fanno schiudere le uova. Tocca un uovo per sapere quante pagine mancano.',
  },
  {
    icona: '🦊',
    titolo: 'I cuccioli',
    testo: 'Tocca un cucciolo per dargli un nome. Cresce con le tue giornate, anche quelle storte, e si ricorda quello che gli racconti.',
  },
  {
    icona: '🌰',
    titolo: 'Le castagne',
    testo: 'Scrivendo guadagni castagne. Altre cadono dal castagno ogni giorno: toccale per raccoglierle. Il numero è in alto a destra.',
  },
  {
    icona: '🔨',
    titolo: 'Costruire',
    testo: "Con le castagne costruisci il villaggio: tocca il martello. Quando ci vedi sopra un pallino giallo, c'è qualcosa di pronto.",
  },
  {
    icona: '❗',
    titolo: 'Le richieste',
    testo: 'Un animale con il punto esclamativo ha una richiesta per te. Esaudiscila e ti regala castagne. Ai più grandi puoi anche insegnare qualcosa.',
  },
  {
    icona: '🌙',
    titolo: 'Il tempo passa',
    testo: 'Gli animali vivono anche quando non ci sei. Torna quando vuoi: ti racconto cosa è successo. Nella Storia trovi i capitoli nuovi.',
  },
  {
    icona: '👆',
    titolo: 'Muoversi nel bosco',
    testo: 'Un dito sposta la vista, due dita avvicinano e girano. Tocca chi vuoi, anche me, per due chiacchiere. Il «?» in alto riapre questa guida.',
  },
];
