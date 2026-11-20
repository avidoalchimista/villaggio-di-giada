// Salvataggio sul telefono (IndexedDB). Niente server: i dati non escono dal dispositivo.
import Dexie, { type Table } from 'dexie';
import type { StatoGioco, VoceDiario } from './tipi';

export interface RigaStato { id: 'unico'; dati: StatoGioco }
export interface RigaMeta { k: string; v: unknown }

class Archivio extends Dexie {
  stato!: Table<RigaStato, string>;
  voci!: Table<VoceDiario, string>;
  meta!: Table<RigaMeta, string>;
  constructor() {
    super('villaggio-di-giada');
    this.version(1).stores({ stato: 'id', voci: 'id, data', meta: 'k' });
  }
}

export const db = new Archivio();

/** Chiede al browser di non cancellare mai i dati per fare spazio. */
export async function chiediSpazioPersistente(): Promise<boolean> {
  try {
    if (navigator.storage?.persisted && (await navigator.storage.persisted())) return true;
    return (await navigator.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}

export async function leggiMeta<T>(k: string, predefinito: T): Promise<T> {
  const r = await db.meta.get(k);
  return (r?.v as T) ?? predefinito;
}

export async function scriviMeta(k: string, v: unknown) {
  await db.meta.put({ k, v });
}
