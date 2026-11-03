import { connectWebView } from './lib/webview-test.mjs';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
const port = process.argv[2] || '9223';
const name = process.argv[3] || 'cordova';
const { send, evaluate, wait, tap, close } = await connectWebView(port);
mkdirSync('artifacts/parity', { recursive: true });
try {
  await send('Page.reload');
  await wait("document.querySelector('#status')?.textContent === 'Ready'");
  assert.equal(await evaluate("document.querySelector('#count').textContent"), 'Count: 0');
  await tap('#add');
  await wait("document.querySelector('#count').textContent === 'Count: 1'");
  await tap('#open');
  await wait("!document.querySelector('#details').hidden");
  await tap('#back');
  await wait("!document.querySelector('#home').hidden");
  await tap('#stop');
  await wait("document.querySelector('#status').textContent === 'Stopped'");
  await tap('#add');
  await wait("document.querySelector('#count').textContent === 'Count: 2'");
  const screenshot = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(`artifacts/parity/android-${name}-web-restored.png`, Buffer.from(screenshot.data, 'base64'));
  await tap('#rail-mode');
  await wait("document.querySelector('#status').textContent === 'Ready' && !!document.querySelector('#rail button')");
  await tap('#rail button');
  await wait("document.querySelector('#count').textContent === 'Count: 3'");
  await tap('#stop');
  await wait("document.querySelector('#status').textContent === 'Stopped'");
  await tap('#add');
  await wait("document.querySelector('#count').textContent === 'Count: 4'");
  await send('Page.reload');
  await wait("document.querySelector('#status')?.textContent === 'Ready'");
  await tap('#add');
  await wait("document.querySelector('#count').textContent === 'Count: 1'");
  console.log(`${name}: Add, details, Back, stop, Web restoration, rail restart and reload passed`);
} finally {
  close();
}
