// Risoluzione che si adatta da sola: il gioco guarda quanto ci mette a disegnare ogni fotogramma.
// Se il computer o il telefono fa fatica, disegna con un po' meno punti (resta fluido);
// se ha fiato, torna nitido. Così la fluidità viene sempre prima della nitidezza.
import type * as THREE from 'three';

/** Il dispositivo si usa col dito (telefono, tablet)? Lì si risparmia un po' di più. */
export const colDito = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;

/** Quanta nitidezza obliqua dare alle texture del suolo (più alta = prato nitido anche lontano). */
export const ANISOTROPIA = { valore: colDito ? 4 : 8 };

export function preparaAnisotropia(renderer: THREE.WebGLRenderer) {
  ANISOTROPIA.valore = Math.min(renderer.capabilities.getMaxAnisotropy(), colDito ? 4 : 16);
}

export class RisoluzioneAdattiva {
  readonly max: number;
  readonly min: number;
  scala: number;
  private campioni: number[] = [];
  private buoni = 0;
  private attesa = 0; // dopo un abbassamento si aspetta di più prima di rialzare (niente su e giù)
  onCambio: () => void = () => {};

  constructor(private renderer: THREE.WebGLRenderer) {
    const dpr = window.devicePixelRatio || 1;
    this.max = Math.min(dpr, 2);
    this.min = Math.max(colDito ? 1 : 0.7, this.max * 0.5);
    this.scala = this.max;
    try {
      const salvata = Number(localStorage.getItem('villaggio-risoluzione'));
      if (salvata >= this.min && salvata <= this.max) this.scala = salvata;
    } catch { /* niente memoria del browser: si parte dal massimo */ }
    renderer.setPixelRatio(this.scala);
  }

  /** Da chiamare a ogni fotogramma con il tempo vero passato (in secondi). */
  passo(dtVero: number) {
    if (dtVero > 0.2 || dtVero <= 0) return; // scheda nascosta o primo fotogramma: non conta
    this.campioni.push(dtVero * 1000);
    if (this.campioni.length < 40) return;
    const ordinati = this.campioni.sort((a, b) => a - b);
    const tipico = ordinati[Math.floor(ordinati.length * 0.6)];
    this.campioni = [];
    if (tipico > 23 && this.scala > this.min) {
      this.imposta(this.scala - 0.15);
      this.buoni = 0;
      this.attesa = 6;
    } else if (tipico < 18.5) {
      if (this.attesa > 0) this.attesa--;
      else if (++this.buoni >= 3 && this.scala < this.max) {
        this.imposta(this.scala + 0.1);
        this.buoni = 0;
      }
    } else this.buoni = 0;
  }

  private imposta(s: number) {
    this.scala = Math.round(Math.max(this.min, Math.min(this.max, s)) * 100) / 100;
    this.renderer.setPixelRatio(this.scala);
    try { localStorage.setItem('villaggio-risoluzione', String(this.scala)); } catch { /* pazienza */ }
    this.onCambio();
  }
}
