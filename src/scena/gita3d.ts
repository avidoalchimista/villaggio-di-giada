// L'escursione vista nella scena: l'animale del cuore di Giada parte dal villaggio, prende il sentiero
// del posto lontano, arriva in fondo dove lo aspetta qualcuno del posto, chiacchierano, e poi torna.
// L'animale vero resta nascosto mentre è via: qui si muove una sua copia, guidata passo passo.
import * as THREE from 'three';
import type { Abitante as AbitanteLontano } from '../lib/escursioni';
import type { Animale } from '../lib/tipi';
import { ampiezzaPasso, creaAnimale, posa, type ModelloAnimale } from './modelli';
import { LUNGHEZZA } from './sentieri3d';

type Fase = 'andata' | 'incontro' | 'ritorno' | 'finita';

/** Un abitante del posto lontano, fatto con le specie che conosciamo. */
function creaLocale(ab: AbitanteLontano): ModelloAnimale {
  const finto: Animale = {
    id: 'lontano-' + ab.nome, nome: ab.nome, specie: ab.specie, sesso: 'f', fase: 'adulto', xp: 0,
    nutrimento: { coraggio: 0, umanita: 0, saggezza: 0, giustizia: 0, temperanza: 0, trascendenza: 0 },
    umore: 90, addormentato: false, mestiere: null, vociPerSchiudersi: 0, nato: '', ricordi: [], genitori: [], abilita: [],
    aspetto: { manto: ab.manto, tratto: '', forma: 0, occhi: 0.6, orecchie: 0.5, taglia: 1, lato: 1 }, studio: null,
  };
  return creaAnimale(finto);
}

export class Gita {
  readonly gruppo = new THREE.Group();
  readonly id: string;
  private viaggiatore: ModelloAnimale;
  private locale: ModelloAnimale;
  private fase: Fase = 'andata';
  private lungo: number; // a che punto del sentiero è (metri dal centro)
  private da: number;
  private a: number;
  private dir: THREE.Vector3;
  private lato: THREE.Vector3;
  private passo = 0;
  /** chiamata quando arriva in fondo al sentiero, e quando è tornato a casa */
  quandoArriva: (() => void) | null = null;
  quandoTorna: (() => void) | null = null;

  constructor(a: Animale, scala: number, gradi: number, raggio: number, locale: AbitanteLontano, partenza: THREE.Vector3) {
    this.id = a.id;
    const ang = (gradi * Math.PI) / 180;
    this.dir = new THREE.Vector3(Math.cos(ang), 0, Math.sin(ang));
    this.lato = new THREE.Vector3(-this.dir.z, 0, this.dir.x);
    this.viaggiatore = creaAnimale(a);
    this.viaggiatore.gruppo.scale.setScalar(scala);
    this.gruppo.add(this.viaggiatore.gruppo);
    // si parte dal bordo della radura, all'imbocco del sentiero (lì davanti non ci sono case)
    void partenza;
    this.da = raggio - 3.5;
    this.a = raggio + LUNGHEZZA - 5.2;
    this.lungo = this.da;
    this.locale = creaLocale(locale);
    this.locale.gruppo.scale.setScalar(0.96);
    const pl = this.punto(this.a + 1.7);
    this.locale.gruppo.position.copy(pl);
    this.locale.gruppo.rotation.y = Math.atan2(-this.dir.x, -this.dir.z); // guarda verso chi arriva
    this.gruppo.add(this.locale.gruppo);
    this.metti();
  }

  private punto(d: number): THREE.Vector3 {
    return this.dir.clone().multiplyScalar(d);
  }

  private metti() {
    const g = this.viaggiatore.gruppo;
    g.position.copy(this.punto(this.lungo));
    const avanti = this.fase === 'ritorno' ? -1 : 1;
    g.rotation.y = Math.atan2(this.dir.x * avanti, this.dir.z * avanti);
  }

  /** Dove sta adesso chi viaggia (per la telecamera). */
  fuoco(): THREE.Vector3 {
    return this.viaggiatore.gruppo.position.clone();
  }

  /** A metà tra i due che chiacchierano. */
  mezzo(): THREE.Vector3 {
    return this.viaggiatore.gruppo.position.clone().lerp(this.locale.gruppo.position, 0.5);
  }

  /** Da dove guardare mentre chiacchierano: un po' alle spalle e un po' di lato, dalla parte del
   * sentiero (lì non ci sono alberi), così si vedono tutti e due in faccia al paesaggio. */
  angoloTreQuarti(): number {
    const v = this.dir.clone().multiplyScalar(-Math.cos(0.75)).addScaledVector(this.lato, Math.sin(0.75));
    return Math.atan2(v.x, v.z);
  }

  /** Da dove guardare: alle spalle di chi cammina. */
  angoloDietro(): number {
    const v = this.fase === 'ritorno' ? this.dir : this.dir.clone().negate();
    return Math.atan2(v.x, v.z);
  }

  get inViaggio(): boolean {
    return this.fase === 'andata' || this.fase === 'ritorno';
  }

  torna() {
    if (this.fase !== 'incontro') return;
    this.fase = 'ritorno';
    this.metti();
  }

  aggiorna(dt: number, t: number) {
    const m = this.viaggiatore;
    if (this.fase === 'andata' || this.fase === 'ritorno') {
      const v = 1.7 * dt;
      this.lungo += this.fase === 'andata' ? v : -v;
      if (this.fase === 'andata' && this.lungo >= this.a) {
        this.lungo = this.a;
        this.fase = 'incontro';
        this.quandoArriva?.();
      } else if (this.fase === 'ritorno' && this.lungo <= this.da) {
        this.lungo = this.da;
        this.fase = 'finita';
        this.quandoTorna?.();
      }
      this.metti();
      this.passo += dt * 11 * (0.6 + 0.4 * ampiezzaPasso(m));
      m.corpo.position.y = Math.abs(Math.sin(this.passo)) * 0.1;
      m.zampe.forEach((z, i) => (z.rotation.x = Math.sin(this.passo + (i === 0 || i === 3 ? 0 : Math.PI)) * 0.7 * ampiezzaPasso(m)));
    } else {
      // fermi a chiacchierare: si guardano, muovono la testa, ogni tanto un saltello di gioia
      m.zampe.forEach((z) => (z.rotation.x = THREE.MathUtils.lerp(z.rotation.x, 0, dt * 6)));
      m.corpo.position.y = Math.max(0, Math.sin(t * 2.2)) * 0.04;
      m.testa.rotation.y = Math.sin(t * 0.9) * 0.15;
      this.locale.testa.rotation.y = Math.sin(t * 1.1 + 1) * 0.2;
      this.locale.testa.rotation.z = Math.sin(t * 2.3) * 0.05;
    }
    posa(m, 0);
    posa(this.locale, 0);
    if (m.coda) m.coda.rotation.y = Math.sin(t * 6) * 0.3;
    if (this.locale.coda) this.locale.coda.rotation.y = Math.sin(t * 4) * 0.3;
  }
}
