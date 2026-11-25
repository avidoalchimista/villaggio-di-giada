// Foto ricordo (fotografo): gli amici del villaggio in posa davanti al treppiede. Ognuno ogni tanto si distrae
// (guarda di lato, chiude gli occhi, sbadiglia), poi torna a sorridere; quando il fotografo dice «Sorriso!»
// sorridono quasi tutti insieme. Giada ha tre scatti: la foto più bella va nell'album del diario.
import * as THREE from 'three';
import { puntiFoto } from '../../lib/minigiochi';
import type { Animale } from '../../lib/tipi';
import { creaAnimale, creaPanchina, espressione, mat, mesh, rifinisci, type ModelloAnimale } from '../modelli';
import { Palco } from './palco';

type Umore = 'sorride' | 'distratto' | 'occhi' | 'sbadiglia';
interface Amico { m: ModelloAnimale; umore: Umore; per: number; lato: number }

const SCATTI = 3;
const POSA_Z = -2.6;

export class Foto extends Palco {
  private amici: Amico[] = [];
  private obiettivo = new THREE.PerspectiveCamera(38, 4 / 3, 0.1, 60);
  private flash!: THREE.Mesh;
  private scatti: { foto: string; punti: number }[] = [];
  private sorriso = 3; // secondi al prossimo «Sorriso!»
  private lampo = 0;

  constructor(canvas: HTMLCanvasElement, dati: Animale, livello: number, amici: Animale[]) {
    super(canvas, dati, livello);
    this.prato('#90c470', '#bfe4f6', 10);
    // la panchina e qualche fiore: il posto delle foto
    const p = creaPanchina();
    p.position.set(0, 0, POSA_Z - 0.55);
    p.scale.setScalar(1.4);
    this.scene.add(p);
    for (let i = 0; i < 7; i++) {
      const f = mesh(new THREE.SphereGeometry(0.06, 6, 5), mat(['#ff8fb1', '#ffd166', '#ffffff', '#c38bff'][i % 4]), -1.6 + i * 0.55, 0.08, POSA_Z - 1.1 + (i % 2) * 0.2);
      this.scene.add(f);
    }
    const chi = (amici.length ? amici : [dati]).slice(0, 4);
    chi.forEach((a, i) => {
      const m = creaAnimale(a);
      const scala = ({ cucciolo: 1.15, giovane: 1.22, adulto: 1.28, maestro: 1.32, uovo: 1 } as const)[a.fase] * 0.85;
      m.gruppo.scale.setScalar(scala * Math.min(1.05, (m.gruppo.userData.taglia as number) ?? 1));
      const x = (i - (chi.length - 1) / 2) * 0.8;
      m.gruppo.position.set(x, 0, POSA_Z + Math.abs(x) * 0.12);
      m.gruppo.rotation.y = -x * 0.08;
      this.scene.add(m.gruppo);
      this.amici.push({ m, umore: 'sorride', per: 1 + Math.random() * 2, lato: i % 2 ? 1 : -1 });
      espressione(m, 'gioia');
    });
    // il fotografo dietro al treppiede, di spalle a noi
    this.bancoDaLavoro(1.5, 0.7, Math.PI - 0.45);
    this.animale(1.72, 1.2, Math.PI - 0.45);
    this.obiettivo.position.set(1.5, 1.3, 0.5);
    this.obiettivo.lookAt(0, 0.75, POSA_Z);
    // il lampo del flash: un velo bianco davanti alla telecamera
    this.flash = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, depthTest: false }));
    this.flash.renderOrder = 999;
    this.camera.add(this.flash);
    this.flash.position.z = -0.5;
    this.scene.add(this.camera);
    this.avvia();
    this.info('Aspetta che sorridano tutti, poi scatta!');
  }

  protected inquadra(a: number) {
    const k = a < 0.8 ? 1.4 : 1;
    this.camera.position.set(0.9 * k, 2.3, 3.2 + 1.8 * k);
    this.camera.lookAt(0.35, 0.65, POSA_Z * 0.45);
  }

  private info(testo: string, urgente = false) {
    this.onInfo({
      testo, urgente, conta: `Foto ${Math.min(SCATTI, this.scatti.length + 1)} di ${SCATTI}`,
      bottoni: this.finito ? [] : [{ id: 'scatta', testo: '📷 Scatta!', colore: '#e8743a' }],
    });
  }

  bottone(id: string) {
    if (id !== 'scatta' || !this.giocando || this.lampo > 0) return;
    const sorridono = this.amici.filter((a) => a.umore === 'sorride').length;
    const punti = puntiFoto(sorridono, this.amici.length);
    this.lampo = 0.5;
    (this.flash.material as THREE.MeshBasicMaterial).opacity = 1;
    if (navigator.vibrate) navigator.vibrate(30);
    // la foto vera si fa dall'obiettivo, un attimo prima del lampo
    for (const a of this.amici) rifinisci(a.m, 0.016, this.orologio.elapsedTime);
    const foto = this.fotografa(this.obiettivo);
    this.scatti.push({ foto, punti });
    const tutti = sorridono === this.amici.length;
    const testo = tutti ? 'Sorridono tutti! Che bella!' : sorridono === 0 ? 'Oh no, nessuno guardava!' : `Sorridono in ${sorridono} su ${this.amici.length}.`;
    this.faccia(tutti ? 'gioia' : 'fiducia');
    if (this.scatti.length >= SCATTI) {
      const migliore = this.scatti.reduce((a, b) => (b.punti > a.punti ? b : a));
      this.info(testo);
      this.finisci({
        punti: migliore.punti, righe: [`La foto più bella: sorridono in ${Math.round(migliore.punti * this.amici.length)} su ${this.amici.length}`],
        ricordo: { foto: migliore.foto },
      });
    } else this.info(testo + ' Ancora una!');
  }

  protected aggiorna(dt: number, t: number) {
    // il velo del flash svanisce
    if (this.lampo > 0) {
      this.lampo -= dt;
      (this.flash.material as THREE.MeshBasicMaterial).opacity = Math.max(0, this.lampo * 2);
    }
    // ogni tanto il fotografo dice «Sorriso!» e (quasi) tutti sorridono insieme
    this.sorriso -= dt;
    if (this.sorriso <= 0 && this.giocando) {
      this.sorriso = 3.5 + Math.random() * 2.5;
      this.sbuffo('😁', this.m.gruppo.position.clone().add(new THREE.Vector3(0, 1.75, 0)), '#ffffff', 0.35);
      for (const a of this.amici) { a.umore = 'sorride'; a.per = 0.9 + Math.random() * 0.9; }
    }
    for (const a of this.amici) {
      a.per -= dt;
      if (a.per <= 0) {
        if (a.umore === 'sorride') {
          const r = Math.random();
          a.umore = r < 0.4 ? 'distratto' : r < 0.7 ? 'occhi' : 'sbadiglia';
          a.per = 0.6 + Math.random() * 1.2;
          a.lato = Math.random() < 0.5 ? -1 : 1;
        } else {
          a.umore = 'sorride';
          a.per = 0.8 + Math.random() * 1.8;
        }
      }
      const m = a.m;
      const [d0, d1] = m.zampe;
      const vuoto = a.umore === 'distratto' ? a.lato * 0.9 : 0;
      m.testa.rotation.y = THREE.MathUtils.lerp(m.testa.rotation.y, vuoto, Math.min(1, dt * 8));
      m.testa.rotation.x = a.umore === 'sbadiglia' ? -0.3 : 0.05;
      espressione(m, a.umore === 'sorride' ? 'gioia' : a.umore === 'occhi' ? 'sonno' : a.umore === 'sbadiglia' ? 'sorpresa' : 'neutro');
      // chi sorride saluta con la zampa
      d1.rotation.x = THREE.MathUtils.lerp(d1.rotation.x, a.umore === 'sorride' ? -2.5 + Math.sin(t * 8) * 0.2 : -0.2, Math.min(1, dt * 6));
      d0.rotation.x = THREE.MathUtils.lerp(d0.rotation.x, -0.2, Math.min(1, dt * 6));
      rifinisci(m, dt, t);
    }
    // il fotografo con le mani sulla macchina
    const [d0, d1] = this.m.zampe;
    d0.rotation.x = -1.8;
    d1.rotation.x = -1.8 + (this.lampo > 0 ? -0.3 : 0);
    this.m.testa.rotation.x = 0;
  }
}
