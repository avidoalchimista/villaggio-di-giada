<script lang="ts">
  // Il corvo dell'intro: lo stesso corvo 3D del villaggio, su un ramo, che si guarda intorno,
  // sbatte le ali e annuisce quando parla. Ogni volta che cambia la battuta fa un saltello.
  import { onDestroy, onMount } from 'svelte';
  import * as THREE from 'three';
  import { creaCorvo, espressione, mat, rifinisci } from '../scena/modelli';
  import { CURVA, materiale } from '../scena/ps1';

  let { battuta = '', taglia = 230 }: { battuta?: string; taglia?: number } = $props();
  let canvas: HTMLCanvasElement;
  let raf = 0;
  let renderer: THREE.WebGLRenderer | null = null;
  let parla = 0;
  let salto = 0;
  let fallito = $state(false);

  // nuova battuta: saltello e qualche secondo di chiacchiera
  $effect(() => {
    if (!battuta) return;
    salto = 1;
    parla = Math.min(4, 1.2 + battuta.length / 40);
  });

  onMount(() => {
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    } catch {
      fallito = true;
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(taglia, taglia, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    const scena = new THREE.Scene();
    scena.add(new THREE.HemisphereLight('#d6ecff', '#b08a5a', 1.4));
    const sole = new THREE.DirectionalLight('#fff1d6', 2.1);
    sole.position.set(2.5, 5, 4);
    scena.add(sole);
    const controluce = new THREE.DirectionalLight('#ffd9a8', 1.2);
    controluce.position.set(-3, 2, -3);
    scena.add(controluce);

    const corvo = creaCorvo();
    // via il palo e l'ombra del villaggio: qui sta su un ramo
    corvo.gruppo.children.slice(0, 2).forEach((o) => (o.visible = false));
    scena.add(corvo.gruppo);
    const uccello = corvo.uccello;

    const ramo = new THREE.Group();
    const legno = materiale({ color: '#7a5636', rim: 0.3 });
    const tronco = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 2.6, 12), legno);
    tronco.rotation.z = Math.PI / 2 - 0.08;
    ramo.add(tronco);
    const rametto = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 0.6, 8), legno);
    rametto.position.set(0.75, 0.2, 0);
    rametto.rotation.z = -0.9;
    ramo.add(rametto);
    const foglia = mat('#6ba552', { rim: 0.35 });
    for (const [x, y, z, s] of [[1.0, 0.42, 0.05, 0.16], [0.88, 0.5, -0.08, 0.12], [-0.9, 0.12, 0.1, 0.14], [-1.05, 0.05, -0.05, 0.11], [1.1, 0.3, 0.12, 0.1]]) {
      const f = new THREE.Mesh(new THREE.SphereGeometry(s, 10, 8), foglia);
      f.position.set(x, y, z);
      f.scale.set(1.3, 0.6, 0.9);
      ramo.add(f);
    }
    ramo.position.set(0, 1.55, 0);
    scena.add(ramo);

    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
    camera.position.set(0.9, 2.55, 4.4);
    camera.lookAt(0, 2.05, 0);
    const prima = CURVA.valore;
    const orologio = new THREE.Clock();
    let guardaVerso = 0, prossimaOcchiata = 2;
    const giro = () => {
      raf = requestAnimationFrame(giro);
      const dt = Math.min(0.05, orologio.getDelta());
      const t = orologio.elapsedTime;
      // ogni tanto si guarda intorno, poi torna a guardare Giada
      prossimaOcchiata -= dt;
      if (prossimaOcchiata <= 0) {
        guardaVerso = parla > 0 ? 0.25 : (Math.random() - 0.5) * 1.4;
        prossimaOcchiata = 1.5 + Math.random() * 2.5;
      }
      const parlando = parla > 0;
      parla = Math.max(0, parla - dt);
      salto = Math.max(0, salto - dt * 2.2);
      const target = parlando ? 0.3 : guardaVerso;
      corvo.testa.rotation.y += (target - corvo.testa.rotation.y) * Math.min(1, dt * 5);
      corvo.testa.rotation.x = parlando ? Math.sin(t * 13) * 0.1 : Math.sin(t * 0.9) * 0.04;
      corvo.testa.rotation.z = Math.sin(t * 0.7) * 0.08 + (parlando ? Math.sin(t * 5) * 0.06 : 0);
      const battito = parlando ? Math.max(0, Math.sin(t * 9)) * 0.7 : Math.sin(t * 8) * 0.4 * (Math.sin(t * 0.45) > 0.93 ? 1 : 0);
      corvo.ali[0].rotation.z = -battito;
      corvo.ali[1].rotation.z = battito;
      espressione(corvo.m, parlando ? 'gioia' : 'fiducia');
      rifinisci(corvo.m, dt, t);
      uccello.position.y = 1.6 + Math.abs(Math.sin(salto * Math.PI)) * 0.35 + Math.sin(t * 2) * 0.012;
      uccello.scale.y = 1 + Math.sin(t * 2) * 0.015;
      corvo.gruppo.rotation.y = 0.35 + Math.sin(t * 0.3) * 0.08;
      ramo.rotation.z = Math.sin(t * 1.1) * 0.015;
      CURVA.valore = 0;
      renderer!.render(scena, camera);
      CURVA.valore = prima;
    };
    giro();
  });

  onDestroy(() => {
    cancelAnimationFrame(raf);
    renderer?.dispose();
  });
</script>

<div class="palco" style:width="{taglia}px" style:height="{taglia}px">
  <canvas bind:this={canvas} style:width="{taglia}px" style:height="{taglia}px" class:nascosto={fallito}></canvas>
</div>

<style>
  .palco {
    position: relative; margin: 0 auto; border-radius: 50%;
    background:
      radial-gradient(circle at 50% 38%, rgba(255, 246, 214, 0.95) 0 22%, rgba(255, 246, 214, 0) 60%),
      radial-gradient(circle at 50% 110%, #8fc37a 0 38%, transparent 39%),
      radial-gradient(circle at 20% 92%, #6ba552 0 24%, transparent 25%),
      radial-gradient(circle at 82% 95%, #5d9a4a 0 26%, transparent 27%),
      linear-gradient(180deg, #a9d6ee, #d9efe0);
    border: 5px solid var(--legno, #8a5a32);
    box-shadow: 0 7px 0 var(--legno-scuro, #5e3b1f), inset 0 0 0 4px rgba(255, 255, 255, 0.5);
    overflow: hidden;
    animation: entra-palco 0.6s cubic-bezier(0.2, 1.5, 0.4, 1) both;
  }
  canvas { display: block; }
  .nascosto { visibility: hidden; }
  @keyframes entra-palco { from { transform: scale(0.6); opacity: 0; } }
</style>
