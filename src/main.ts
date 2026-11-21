import { mount } from 'svelte';
import { registerSW } from 'virtual:pwa-register';
import App from './App.svelte';
import { preparaInstallazione } from './lib/telefono';
import '@fontsource-variable/nunito';
import './stile.css';

registerSW({ immediate: true });
preparaInstallazione();

// solo in sviluppo: accesso alle funzioni dalla console per le prove
if (import.meta.env.DEV) import('./lib/app.svelte').then((m) => ((window as unknown as Record<string, unknown>).villaggio = m));

export default mount(App, { target: document.getElementById('app')! });
