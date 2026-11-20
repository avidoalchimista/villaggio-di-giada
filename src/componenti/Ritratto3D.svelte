<script lang="ts">
  // Ritratto 3D dell'animale nella sua scheda: lo stesso modello del villaggio, che gira piano su se stesso.
  import { onDestroy, onMount } from 'svelte';
  import * as THREE from 'three';
  import type { Animale } from '../lib/tipi';
  import { creaAnimale, posa } from '../scena/modelli';
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
    const e = animale.fase === 'cucciolo' ? 0 : animale.fase === 'giovane' ? 0.6 : 1;
    posa(m, e);
    m.gruppo.scale.setScalar(1.6);
    scena.add(m.gruppo);
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
    const altezza = e > 0.5 ? 1.5 : 1.2;
    camera.position.set(0, altezza + 0.6, 5.2);
    camera.lookAt(0, altezza, 0);
    const prima = CURVA.valore;
    const giro = () => {
      raf = requestAnimationFrame(giro);
      const t = performance.now() / 1000;
      m.gruppo.rotation.y = Math.sin(t * 0.6) * 0.9;
      m.testa.rotation.z = Math.sin(t * 1.1) * 0.08;
      CURVA.valore = 0; // nel ritratto niente mondo curvo
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

<canvas bind:this={canvas} style:width="{taglia}px" style:height="{taglia}px"></canvas>

<style>
  canvas { display: block; margin: 0 auto; }
</style>
