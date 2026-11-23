// Il villaggio come "app" sul telefono: icona nella schermata Home e dati che restano.
// Capisce da dove è aperto il gioco per mostrare a Giada la guida giusta.

export type Dove =
  | 'app' // aperto dall'icona: tutto a posto
  | 'iphone' // Safari (o un altro browser) su iPhone/iPad
  | 'android' // Chrome o simili su Android
  | 'dentro-app' // browser interno di WhatsApp, Instagram, Telegram...: i dati possono sparire
  | 'computer';

interface EventoInstalla extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let richiestaInstalla: EventoInstalla | null = null;
const ascoltatori = new Set<() => void>();

/** Da chiamare all'avvio: Android offre l'installazione con un evento da tenere da parte. */
export function preparaInstallazione() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    richiestaInstalla = e as EventoInstalla;
    ascoltatori.forEach((f) => f());
  });
  window.addEventListener('appinstalled', () => {
    richiestaInstalla = null;
    ascoltatori.forEach((f) => f());
  });
}

export function puoInstallareConUnTocco() {
  return richiestaInstalla !== null;
}

export function quandoCambiaInstallazione(f: () => void) {
  ascoltatori.add(f);
  return () => ascoltatori.delete(f);
}

/** Android: apre la finestra "Installa app". true se Giada ha accettato. */
export async function installaConUnTocco(): Promise<boolean> {
  if (!richiestaInstalla) return false;
  const r = richiestaInstalla;
  await r.prompt();
  const { outcome } = await r.userChoice;
  richiestaInstalla = null;
  return outcome === 'accepted';
}

export function apertoDallIcona(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.matchMedia?.('(display-mode: fullscreen)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function doveSiamo(ua = navigator.userAgent, touch = navigator.maxTouchPoints ?? 0): Dove {
  if (apertoDallIcona()) return 'app';
  if (/FBAN|FBAV|FB_IAB|Instagram|Line\/|Telegram|WhatsApp|Snapchat|TikTok|musical_ly|; wv\)|GSA\//i.test(ua)) return 'dentro-app';
  // iPad recenti si presentano come Mac, ma hanno lo schermo touch
  if (/iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && touch > 1)) return 'iphone';
  if (/Android/i.test(ua)) return 'android';
  return 'computer';
}
