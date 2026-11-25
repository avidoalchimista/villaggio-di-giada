<script lang="ts">
  // Ritratto 3D dell'animale nella sua scheda: lo stesso modello del villaggio, che gira piano su se stesso.
  import { onDestroy, onMount } from 'svelte';
  import * as THREE from 'three';
  import type { Animale } from '../lib/tipi';
  import { creaAnimale, espressione, posa, rifinisci } from '../scena/modelli';
  import { CURVA } from '../scena/ps1';

  let { animale, taglia = 220 }: { animale: Animale; taglia?: number } = $props();
  let canvas: HTMLCanvasElement;
  let raf = 0;
  let renderer: THREE.WebGLRenderer | null = null;

  onMount(() => {
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    } catch {
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(taglia, taglia, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    const scena = new THREE.Scene();
    scena.add(new THREE.HemisphereLight('#bfe0ff', '#c9a27a', 1.3));
    const sole = new THREE.DirectionalLight('#fff1d6', 2);
    sole.position.set(3, 5, 4);
    scena.add(sole);
    const m = creaAnimale(animale);
    // l'inquadratura si adatta alla sua sagoma
    posa(m, 0);
    m.gruppo.scale.setScalar(1.6);
    scena.add(m.gruppo);
    const box = new THREE.Box3().setFromObject(m.gruppo);
    const centro = box.getCenter(new THREE.Vector3());
    const misura = box.getSize(new THREE.Vector3());
    const lato = Math.max(misura.x, misura.y, misura.z);
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
    camera.position.set(0, centro.y + lato * 0.25, lato * 2.4 + 1);
    camera.lookAt(0, centro.y, 0);
    const prima = CURVA.valore;
    espressione(m, 'fiducia');
    let tPrima = performance.now() / 1000;
    const giro = () => {
      raf = requestAnimationFrame(giro);
      const t = performance.now() / 1000;
      m.gruppo.rotation.y = 0.75 + Math.sin(t * 0.6) * 0.5; // di tre quarti, così si vede la sagoma
      m.testa.rotation.z = Math.sin(t * 1.1) * 0.08;
      // sbatte gli occhi, respira, muove coda e orecchie
      for (const o of m.occhi) o.scale.y = t % 3.7 < 0.12 ? 0.15 : 1;
      if (m.coda) m.coda.rotation.y = Math.sin(t * 2.2) * 0.3;
      rifinisci(m, Math.min(0.1, t - tPrima), t);
      tPrima = t;
      CURVA.valore = 0; // nel ritratto niente mondo curvo
      renderer!.render(scena, camera);
      CURVA.valore = prima;
    };
    giro();
  });

  onDestroy(() => {
    cancelAnimationFrame(raf);
    renderer?.dispose();
    renderer?.forceContextLoss(); // libera subito il disegno 3D (il telefono ne tiene pochi aperti insieme)
  });
</script>

<canvas bind:this={canvas} style:width="{taglia}px" style:height="{taglia}px"></canvas>

<style>
  canvas { display: block; margin: 0 auto; }
</style>
