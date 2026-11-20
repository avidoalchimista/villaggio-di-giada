import { mount } from 'svelte';
import { registerSW } from 'virtual:pwa-register';
import App from './App.svelte';
import '@fontsource-variable/nunito';
import './stile.css';

registerSW({ immediate: true });

export default mount(App, { target: document.getElementById('app')! });
