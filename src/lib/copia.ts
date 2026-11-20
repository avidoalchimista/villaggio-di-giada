// Copia di sicurezza: un file JSON con tutto, diario incluso.
import { SCHEMA } from './gioco';
import type { StatoGioco, VoceDiario } from './tipi';

export interface FileCopia {
  app: 'villaggio-di-giada';
  versioneSchema: number;
  esportato: string;
  stato: StatoGioco;
  voci: VoceDiario[];
}

export function creaCopia(stato: StatoGioco, voci: VoceDiario[]): FileCopia {
  return { app: 'villaggio-di-giada', versioneSchema: SCHEMA, esportato: new Date().toISOString(), stato, voci };
}

/** Porta un file vecchio alla versione attuale dello schema. */
export function migra(f: FileCopia): FileCopia {
  if (f.app !== 'villaggio-di-giada' || !f.stato || !Array.isArray(f.voci)) {
    throw new Error('Questo file non sembra una copia del villaggio.');
  }
  if (f.versioneSchema > SCHEMA) {
    throw new Error("Questa copia viene da una versione più nuova dell'app: aggiorna prima l'app.");
  }
  // qui andranno le migrazioni: if (f.versioneSchema < 2) { ... }
  return { ...f, versioneSchema: SCHEMA, stato: { ...f.stato, versioneSchema: SCHEMA } };
}

export function scaricaFile(nome: string, contenuto: string) {
  const blob = new Blob([contenuto], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
