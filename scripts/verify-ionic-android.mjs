import { connectWebView } from './lib/webview-test.mjs';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
const port = process.argv[2] || '9223';
const name = process.argv[3] || 'cordova';
const { send, evaluate, wait, tap, close } = await connectWebView(port);
mkdirSync('artifacts/ionic-parity', { recursive: true });
try {
  await send('Page.reload');
  await wait("document.querySelector('#status')?.textContent === 'Ready'");
  const initial = await evaluate('window.parity.snapshot()');
  assert.equal(initial.connected, true, 'Theme must share the running Native UI integration');
  assert.equal(initial.runtimeConnected, true);
  assert.notEqual(initial.themeRadius, '0px', 'Theme list styles must be loaded');
  await tap('#add');
  await wait("document.querySelector('#count').textContent === 'Count: 1'");
  await tap('ion-segment-button[value=two]');
  await wait("document.querySelector('#selection').textContent === 'Segment: two'");
  await tap('ion-tab-button[tab=settings]');
  await wait("!document.querySelector('ion-tab[tab=settings]').classList.contains('tab-hidden')");
  await tap('ion-tab-button[tab=home]');
  await wait("!document.querySelector('ion-tab[tab=home]').classList.contains('tab-hidden')");
  await tap('#transition');
  await wait("document.querySelector('#transition-result').textContent === 'Transition: passed'");
  for (const selector of ['#modal', '#popover']) {
    await tap(selector);
    await wait("!!document.querySelector('#dismiss-overlay')");
    await new Promise((r) => setTimeout(r, 600));
    await tap('#dismiss-overlay');
    await wait("!document.querySelector('#dismiss-overlay')");
  }
  await tap('#search-trigger');
  await new Promise((r) => setTimeout(r, 700));
  await evaluate("document.querySelector('#search').setFocus()");
  await send('Input.insertText', { text: 'apple' });
  await wait("document.querySelector('#query').textContent === 'Query: apple'");
  await tap('#close-search');
  await tap('#dark');
  await wait("document.documentElement.classList.contains('ion-palette-dark')");
  await new Promise((r) => setTimeout(r, 300));
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(`artifacts/ionic-parity/android-${name}-dark.png`, Buffer.from(shot.data, 'base64'));
  await tap('#stop');
  await wait("document.querySelector('#status').textContent === 'Stopped'");
  await tap('#add');
  await wait("document.querySelector('#count').textContent === 'Count: 2'");
  await tap('#restart');
  await wait("document.querySelector('#status').textContent === 'Ready'");
  assert.equal(await evaluate('window.parity.snapshot().connected'), true);
  writeFileSync(
    `artifacts/ionic-parity/android-${name}.json`,
    JSON.stringify(
      {
        initial,
        final: await evaluate('window.parity.snapshot()'),
        passed: ['theme', 'add', 'segment', 'transition integration', 'modal', 'popover', 'search input', 'dark', 'stop', 'restart'],
      },
      null,
      2,
    ),
  );
  console.log(`${name}: Ionic theme, controls, overlays, search, dark mode and restart passed`);
} finally {
  close();
}
