// Il cielo: una cupola dipinta intorno alla telecamera, al posto della tinta unica.
// Di giorno sfuma dall'azzurro pieno in alto al chiaro dell'orizzonte (che è lo stesso colore
// della nebbia, così il bosco lontano si scioglie nel cielo), con nuvolette morbide che passano
// e il sole; al tramonto si scalda; di notte si accendono stelle e luna.
// Tutto è calcolato in un solo disegno, senza immagini da scaricare: leggero anche sul telefono.
import * as THREE from 'three';

const VERT = `
varying vec3 vDir;
void main() {
  vDir = position;
  // solo la rotazione della telecamera: il cielo è sempre "infinitamente lontano"
  vec4 p = projectionMatrix * vec4(mat3(viewMatrix) * position, 1.0);
  gl_Position = vec4(p.xy, 0.0, p.w);
}`;

const FRAG = `
uniform vec3 uZenit; uniform vec3 uOrizzonte; uniform vec3 uSole; uniform vec3 uSoleCol;
uniform float uNotte; uniform float uNuvole; uniform float uTempo; uniform float uNuvoleScure;
uniform float uOrizY; uniform float uSpan;
// le costellazioni disegnate da Giada con l'astronomo: segmenti (θ1, h1, θ2, h2) e stelle (θ, h)
uniform vec4 uSeg[48]; uniform int uNSeg;
uniform vec4 uStella[48]; uniform int uNStelle;
varying vec3 vDir;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float rumore(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}
float hash3(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
float rumore3(vec3 p) {
  vec3 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = mix(mix(hash3(i), hash3(i + vec3(1, 0, 0)), f.x), mix(hash3(i + vec3(0, 1, 0)), hash3(i + vec3(1, 1, 0)), f.x), f.y);
  float b = mix(mix(hash3(i + vec3(0, 0, 1)), hash3(i + vec3(1, 0, 1)), f.x), mix(hash3(i + vec3(0, 1, 1)), hash3(i + vec3(1, 1, 1)), f.x), f.y);
  return mix(a, b, f.z);
}
// nuvole su un cilindro intorno al villaggio: nessuna cucitura girando la telecamera
float fbm(vec3 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { v += a * rumore3(p); p = p * 2.03 + 7.1; a *= 0.5; }
  return v;
}

void main() {
  vec3 d = normalize(vDir);
  // la telecamera guarda in giù e il mondo è curvo: l'orizzonte che si vede è più in basso di quello vero.
  // h = 0 dove finisce il prato sullo schermo, 1 in cima allo schermo; dv è la direzione "come se"
  // il cielo cominciasse lì, così sfumatura, sole, nuvole e stelle stanno nella striscia di cielo visibile.
  float h = (d.y - uOrizY) / uSpan;
  vec2 az = normalize(d.xz + 1e-5);
  float e = clamp(h, -1.0, 2.5) * 0.45;
  vec3 dv = vec3(az.x * cos(e), sin(e), az.y * cos(e));
  float salita = smoothstep(0.0, 1.0, h);
  vec3 col = mix(uOrizzonte, uZenit, pow(salita, 0.75));

  // sole (di giorno) o luna (di notte): disco morbido con un alone
  float vSole = max(dot(dv, normalize(uSole)), 0.0);
  float alone = pow(vSole, 18.0) * 0.35 + pow(vSole, 180.0) * 0.5;
  float disco = smoothstep(0.9985, 0.9992, vSole);
  col += uSoleCol * alone * (1.0 - uNuvole * 0.6);
  col = mix(col, uSoleCol * 1.15 + 0.1, disco * (1.0 - uNuvole * 0.85));

  // stelle: puntini tondi fermi che brillano piano (solo di notte e col cielo sgombro)
  float alt = d.y - uOrizY; // radianti sopra l'orizzonte che si vede
  if (uNotte > 0.05 && h > 0.0) {
    vec2 q = vec2(atan(az.y, az.x), alt) * 55.0;
    vec2 cella = floor(q);
    float s = hash(cella);
    vec2 centro = vec2(hash(cella + 3.1), hash(cella + 7.7)) * 0.6 + 0.2;
    float punto = smoothstep(0.16, 0.04, length(fract(q) - centro));
    float brilla = 0.55 + 0.45 * sin(uTempo * (1.2 + s * 2.5) + s * 40.0);
    float stella = step(0.9, s) * punto * brilla * smoothstep(0.05, 0.3, h);
    col += vec3(1.0, 0.95, 0.85) * stella * uNotte * (1.0 - uNuvole);
  }

  // le costellazioni di Giada: linee d'oro sottili e stelle più grandi (solo di notte)
  if (uNotte > 0.05 && h > 0.0 && (uNSeg > 0 || uNStelle > 0)) {
    float th = atan(az.y, az.x);
    float luce = 0.0;
    for (int i = 0; i < 48; i++) {
      if (i >= uNSeg) break;
      vec4 sg = uSeg[i];
      vec2 a = vec2(mod(sg.x - th + 3.14159, 6.28318) - 3.14159, (sg.y - h) * uSpan);
      vec2 b = vec2(mod(sg.z - th + 3.14159, 6.28318) - 3.14159, (sg.w - h) * uSpan);
      vec2 ab = b - a;
      float t = clamp(dot(-a, ab) / max(dot(ab, ab), 1e-6), 0.0, 1.0);
      float dl = length(a + ab * t);
      luce = max(luce, smoothstep(0.0028, 0.0008, dl) * 0.45);
    }
    for (int i = 0; i < 48; i++) {
      if (i >= uNStelle) break;
      vec4 st = uStella[i];
      vec2 p = vec2(mod(st.x - th + 3.14159, 6.28318) - 3.14159, (st.y - h) * uSpan);
      float dp = length(p);
      float brilla = 0.8 + 0.2 * sin(uTempo * 2.0 + float(i) * 1.7);
      luce = max(luce, smoothstep(0.0075, 0.002, dp) * brilla + smoothstep(0.02, 0.0, dp) * 0.25);
    }
    col += vec3(1.0, 0.86, 0.45) * luce * uNotte * (1.0 - uNuvole * 0.8);
  }

  // nuvole: un piano sopra il villaggio, che scorre piano col vento
  if (h > 0.0) {
    float giro = uTempo * 0.004; // le nuvole girano piano intorno al villaggio
    vec2 azg = vec2(az.x * cos(giro) - az.y * sin(giro), az.x * sin(giro) + az.y * cos(giro));
    vec3 pn = vec3(azg.x * 2.6, alt * 9.0, azg.y * 2.6);
    float n = fbm(pn);
    float soglia = mix(0.6, 0.34, uNuvole);
    float nuvola = smoothstep(soglia, soglia + 0.08, n) * smoothstep(0.02, 0.3, h);
    float ombra = smoothstep(soglia + 0.04, soglia + 0.3, n); // dove la nuvola è più spessa, un'ombra morbida (un solo calcolo: leggero sul telefono)
    vec3 bianco = mix(vec3(1.0, 0.99, 0.96), uSoleCol, 0.25);
    vec3 pancia = mix(uOrizzonte, uZenit, 0.35) * 0.95;
    vec3 colNuvola = mix(bianco, pancia, ombra * 0.55);
    colNuvola = mix(colNuvola, uZenit * 1.6 + vec3(0.03, 0.03, 0.05), uNotte);
    colNuvola = mix(colNuvola, vec3(0.55, 0.58, 0.63) * (1.0 - uNotte * 0.6), uNuvoleScure);
    col = mix(col, colNuvola, nuvola * 0.92);
  }
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`;

export class Cielo {
  readonly mesh: THREE.Mesh;
  private u = {
    uZenit: { value: new THREE.Color('#5aa6dc') },
    uOrizzonte: { value: new THREE.Color('#a9cfe4') },
    uSole: { value: new THREE.Vector3(0.4, 0.5, -0.8) },
    uSoleCol: { value: new THREE.Color('#fff1d6') },
    uNotte: { value: 0 },
    uNuvole: { value: 0.2 },
    uNuvoleScure: { value: 0 },
    uTempo: { value: 0 },
    uOrizY: { value: 0 },
    uSpan: { value: 0.3 },
    uSeg: { value: Array.from({ length: 48 }, () => new THREE.Vector4()) },
    uNSeg: { value: 0 },
    uStella: { value: Array.from({ length: 48 }, () => new THREE.Vector4()) },
    uNStelle: { value: 0 },
  };
  private v = new THREE.Vector3();
  private w = new THREE.Vector3();

  constructor() {
    const m = new THREE.ShaderMaterial({
      uniforms: this.u, vertexShader: VERT, fragmentShader: FRAG,
      side: THREE.BackSide, depthWrite: false, depthTest: false, fog: false,
    });
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16), m);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = -1000; // per primo, dietro a tutto
    this.mesh.raycast = () => {};
    this.mesh.userData.senzaContorno = true;
  }

  /**
   * ora: 0-24; orizzonte = colore della nebbia; giorno 0-1; tramonto 0-1; coperto 0-1 (nuvole del meteo).
   */
  aggiorna(ora: number, orizzonte: THREE.Color, giorno: number, tramonto: number, coperto: number, brutto: boolean) {
    const u = this.u;
    u.uOrizzonte.value.copy(orizzonte);
    // in alto il cielo è più pieno; al tramonto si fa lilla, di notte blu profondo
    const z = new THREE.Color('#0b1236').lerp(new THREE.Color('#4a98d6'), giorno).lerp(new THREE.Color('#7f7fc4'), tramonto * 0.5);
    z.lerp(orizzonte.clone().multiplyScalar(0.92), coperto * 0.75);
    u.uZenit.value.copy(z);
    u.uNotte.value = Math.max(0, 1 - giorno * 1.6);
    u.uNuvole.value = Math.min(1, 0.22 + coperto * 0.9);
    u.uNuvoleScure.value = brutto ? 0.6 : coperto * 0.35;
    // il sole gira intorno al villaggio nel corso della giornata; di notte al suo posto c'è la luna
    const diGiorno = giorno > 0.02;
    const a = diGiorno ? ((ora - 6) / 14) * Math.PI : (((ora + 24 - 20) % 24) / 10) * Math.PI;
    const alto = 0.08 + Math.max(0, Math.sin(a)) * 0.22; // nella striscia di cielo che si vede
    u.uSole.value.set(Math.cos(a) * 0.9, alto, -0.55).normalize();
    if (diGiorno) u.uSoleCol.value.set(tramonto > 0.2 ? '#ffb27a' : '#fff1d6');
    else u.uSoleCol.value.set('#e8eeff').multiplyScalar(0.75);
  }

  /** Dove finisce il prato sullo schermo (mondo curvo) e dove finisce lo schermo in alto. */
  inquadra(cam: THREE.PerspectiveCamera, curva: number) {
    cam.updateMatrixWorld();
    const avanti = cam.getWorldDirection(this.v);
    avanti.y = 0;
    if (avanti.lengthSq() < 1e-6) return;
    avanti.normalize();
    const p = this.w.copy(cam.position).addScaledVector(avanti, cam.far * 0.97).setY(0);
    p.applyMatrix4(cam.matrixWorldInverse);
    p.y -= p.z * p.z * curva;
    p.applyMatrix4(cam.projectionMatrix);
    const yOr = Math.max(-1, Math.min(1, p.y));
    const dirOr = this.v.set(0, yOr, 0.5).unproject(cam).sub(cam.position).normalize().y;
    const dirAlto = this.w.set(0, 1, 0.5).unproject(cam).sub(cam.position).normalize().y;
    this.u.uOrizY.value = dirOr;
    this.u.uSpan.value = Math.max(0.05, dirAlto - dirOr);
  }

  /**
   * Le costellazioni disegnate con l'astronomo (punti tra 0 e 1), una accanto all'altra a partire
   * dalla direzione `theta0` (dove guarda la telecamera all'inizio), così la prima si vede subito.
   */
  costellazioni(lista: { punti: [number, number][]; linee: [number, number][] }[], theta0: number) {
    let ns = 0, nl = 0;
    lista.slice(-6).forEach((c, k) => {
      const centro = theta0 + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 0.55;
      const pos = c.punti.map(([u, v]) => [centro + (u - 0.5) * 0.36, 0.86 - v * 0.48] as const);
      for (const [x, y] of pos) if (ns < 48) this.u.uStella.value[ns++].set(x, y, 0, 0);
      for (const [a, b] of c.linee) if (nl < 48 && pos[a] && pos[b]) this.u.uSeg.value[nl++].set(pos[a][0], pos[a][1], pos[b][0], pos[b][1]);
    });
    this.u.uNStelle.value = ns;
    this.u.uNSeg.value = nl;
  }

  passo(t: number) {
    this.u.uTempo.value = t;
  }
}
