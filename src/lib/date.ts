// Date come stringhe AAAA-MM-GG nel fuso locale: niente sorprese con l'ora legale.

export function oggi(d = new Date()): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const g = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${g}`;
}

function aUTC(s: string): number {
  const [a, m, g] = s.split('-').map(Number);
  return Date.UTC(a, m - 1, g);
}

export function giorniTra(da: string, a: string): number {
  return Math.round((aUTC(a) - aUTC(da)) / 86400000);
}

export function aggiungiGiorni(s: string, n: number): string {
  const d = new Date(aUTC(s) + n * 86400000);
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const g = String(d.getUTCDate()).padStart(2, '0');
  return `${d.getUTCFullYear()}-${m}-${g}`;
}

export function meseDi(s: string): string {
  return s.slice(0, 7);
}
