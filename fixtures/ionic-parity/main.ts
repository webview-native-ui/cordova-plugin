import { initialize, modalController, popoverController } from '@ionic/core/components/index.js';
import {
  iosTransitionAnimation,
  popoverEnterAnimation,
  popoverLeaveAnimation,
  attachTabBarSearchable,
  TabBarSearchableType,
  registerSegmentEffect,
} from '@rdlabo/ionic-theme-ios27';
import { hasNativeUIIntegration, suspendNativeUI } from '@rdlabo/capacitor-native-ui/integration';
import { hasNativeUIIntegration as runtimeConnected } from '@parity/integration';
import { enableNativeUI } from '@parity/native';
import { search, home, settings } from 'ionicons/icons';
import './registrations';
import './style.css';
initialize({ mode: 'ios', navAnimation: iosTransitionAnimation, popoverEnter: popoverEnterAnimation, popoverLeave: popoverLeaveAnimation });
const icons = { search, home, settings };
for (const icon of document.querySelectorAll<HTMLElement>('ion-icon[data-icon]'))
  (icon as any).icon = icons[icon.dataset.icon as keyof typeof icons];
const $ = (id: string): any => document.getElementById(id);
let shell: any;
let count = 0;
const snapshot = () => {
  const connected = hasNativeUIIntegration(document);
  $('integration').textContent = `Theme integration: ${connected}`;
  return {
    connected,
    runtimeConnected: runtimeConnected(document),
    status: shell?.getStatus(),
    count,
    projected: document.querySelectorAll('[data-native-ui-projected]').length,
    themeRadius: getComputedStyle(document.querySelector('ion-item-group')!).borderRadius,
  };
};
const start = async () => {
  await shell?.destroy();
  shell = await enableNativeUI({ verticalBars: { enabled: false }, debug: true });
  $('status').textContent = 'Ready';
  snapshot();
};
class ParityOverlay extends HTMLElement {
  connectedCallback() {
    this.innerHTML =
      '<ion-header><ion-toolbar><ion-title>Overlay content</ion-title></ion-toolbar></ion-header><ion-content><p>Theme overlay</p><ion-button id="dismiss-overlay">Close overlay</ion-button></ion-content>';
    this.querySelector('#dismiss-overlay')!.addEventListener('click', async () => {
      const overlay: any = this.closest('ion-modal,ion-popover');
      await overlay.dismiss();
      $('overlay-result').textContent = 'Overlay dismissed';
    });
  }
}
customElements.define('parity-overlay', ParityOverlay);
async function boot() {
  await Promise.all(
    Array.from(document.querySelectorAll('*'))
      .filter((e: any) => e.componentOnReady)
      .map((e: any) => e.componentOnReady()),
  );
  await new Promise((resolve) => setTimeout(resolve, 300));
  $('add').addEventListener('click', () => {
    $('count').textContent = `Count: ${++count}`;
  });
  $('segment').addEventListener('ionChange', (e: any) => {
    $('selection').textContent = `Segment: ${e.detail.value}`;
  });
  $('search').addEventListener('ionInput', (e: any) => {
    $('query').textContent = `Query: ${e.detail.value || 'empty'}`;
  });
  registerSegmentEffect($('segment'));
  const searchable = attachTabBarSearchable($('tabs'), $('search-trigger'), $('search-footer'));
  $('search-trigger').addEventListener('click', (event: Event) => searchable(event, TabBarSearchableType.Enter));
  $('close-search').addEventListener('click', (event: Event) => searchable(event, TabBarSearchableType.Leave));
  for (const [id, controller] of [
    ['modal', modalController],
    ['popover', popoverController],
  ] as const) {
    $(id).addEventListener('click', async (event: Event) => {
      $('overlay-result').textContent = '';
      const overlay = await controller.create({ component: 'parity-overlay', ...(id === 'popover' ? { event } : {}) });
      await overlay.present();
    });
  }
  $('transition').addEventListener('click', async () => {
    const connected = hasNativeUIIntegration(document);
    const release = await suspendNativeUI([document.querySelector('.ion-page')!]);
    const suspended = document.querySelectorAll('[data-native-ui-projected]').length;
    await release();
    $('transition-result').textContent = `Transition: ${connected && suspended === 0 ? 'passed' : 'failed'}`;
  });
  $('dark').addEventListener('click', () => document.documentElement.classList.toggle('ion-palette-dark'));
  $('stop').addEventListener('click', async () => {
    await shell.destroy();
    $('status').textContent = 'Stopped';
    snapshot();
  });
  $('restart').addEventListener('click', start);
  (window as any).parity = {
    snapshot,
    stop: async () => {
      await shell.destroy();
      snapshot();
    },
  };
  await start();
}
if ((window as any).cordova)
  document.addEventListener('deviceready', () =>
    boot().catch((e) => {
      $('status').textContent = String(e);
      console.error(e);
    }),
  );
else
  boot().catch((e) => {
    $('status').textContent = String(e);
    console.error(e);
  });
