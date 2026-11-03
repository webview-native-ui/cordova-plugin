import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, cpSync } from 'node:fs';
import { resolve } from 'node:path';
import { build } from 'esbuild';
const base = 'artifacts/ionic-parity';
mkdirSync(base, { recursive: true });
const name = JSON.parse(readFileSync('package.json', 'utf8')).name;
const [archive] = JSON.parse(execFileSync('npm', ['pack', '--ignore-scripts', '--json', '--pack-destination', base], { encoding: 'utf8' }));
const digest = createHash('sha256')
  .update(readFileSync(`${base}/${archive.filename}`))
  .digest('hex')
  .slice(0, 12);
const archiveName = archive.filename.replace('.tgz', `-${digest}.tgz`);
cpSync(`${base}/${archive.filename}`, `${base}/${archiveName}`);
const consumer = `${base}/consumer`;
mkdirSync(consumer, { recursive: true });
writeFileSync(
  `${consumer}/package.json`,
  JSON.stringify({ private: true, type: 'module', dependencies: { [name]: `file:../${archiveName}`, '@ionic/core': '8.8.19' } }, null, 2) +
    '\n',
);
execFileSync('npm', ['install', '--prefix', consumer, '--ignore-scripts', '--no-audit', '--no-fund'], { stdio: 'inherit' });
const components = [
  'app',
  'tabs',
  'tab',
  'tab-bar',
  'tab-button',
  'header',
  'toolbar',
  'title',
  'buttons',
  'button',
  'segment',
  'segment-button',
  'label',
  'content',
  'list',
  'item-group',
  'item',
  'fab',
  'fab-button',
  'footer',
  'searchbar',
  'icon',
  'modal',
  'popover',
  'backdrop',
];
const src = `${base}/src`;
mkdirSync(src, { recursive: true });
for (const name of ['main.ts', 'style.css']) cpSync(`fixtures/ionic-parity/${name}`, `${src}/${name}`);
writeFileSync(
  `${src}/registrations.ts`,
  `import { initialize } from '@ionic/core/components/index.js';\ninitialize({mode:'ios'});\n` +
    components
      .map((name, i) => `import {defineCustomElement as define${i}} from '@ionic/core/components/ion-${name}.js';\ndefine${i}();`)
      .join('\n'),
);
for (const host of ['capacitor', 'cordova']) {
  const output = `${base}/${host}/www`;
  mkdirSync(output, { recursive: true });
  const cordova = host === 'cordova';
  const alias = {
    '@parity/native': resolve(cordova ? 'dist/index.js' : '.upstream/dist/esm/index.js'),
    '@ionic/core': resolve('node_modules/@ionic/core'),
    ionicons: resolve('node_modules/ionicons'),
    '@parity/integration': resolve(
      cordova ? 'shared/core/native-integration/index.js' : '.upstream/packages/native-ui-core/dist/native-integration/index.js',
    ),
    '@rdlabo/capacitor-native-ui/integration': resolve(
      host === 'cordova' ? 'shared/core/native-integration/index.js' : '.upstream/packages/native-ui-core/dist/native-integration/index.js',
    ),
  };
  let entry = `${src}/main.ts`;
  if (cordova) {
    const consumerSource = `${consumer}/src`;
    mkdirSync(consumerSource, { recursive: true });
    cpSync(`${src}/registrations.ts`, `${consumerSource}/registrations.ts`);
    writeFileSync(
      `${consumerSource}/main.ts`,
      readFileSync(`${src}/main.ts`, 'utf8')
        .replaceAll("'@parity/native'", JSON.stringify(name))
        .replaceAll("'@parity/integration'", JSON.stringify(`${name}/integration`))
        .replaceAll("'@rdlabo/capacitor-native-ui/integration'", JSON.stringify(`${name}/integration`))
        .replaceAll("'@rdlabo/ionic-theme-ios27'", JSON.stringify(`${name}/theme`)),
    );
    writeFileSync(
      `${consumerSource}/style.css`,
      readFileSync(`${src}/style.css`, 'utf8').replaceAll('@rdlabo/ionic-theme-ios27/dist/css/', `${name}/theme/css/`),
    );
    entry = `${consumerSource}/main.ts`;
  }
  const result = await build({
    entryPoints: [entry],
    bundle: true,
    format: 'iife',
    platform: 'browser',
    target: 'es2020',
    outdir: output,
    ...(cordova ? {} : { alias }),
    metafile: true,
  });
  if (cordova) {
    const inputs = Object.keys(result.metafile.inputs);
    assert.equal(inputs.filter((path) => path.endsWith('native-integration/index.js')).length, 1);
    assert(!inputs.some((path) => /node_modules\/(?:@capacitor|@rdlabo\/(?:capacitor-native-ui|ionic-theme-ios27))\//.test(path)));
  }
  writeFileSync(`${base}/${host}/metafile.json`, JSON.stringify(result.metafile, null, 2));
  writeFileSync(
    `${output}/index.html`,
    readFileSync('fixtures/ionic-parity/index.html', 'utf8').replace(
      '<script src="HOST.js"></script>',
      cordova ? '<script src="cordova.js"></script>' : '',
    ),
  );
}
console.log('Built Capacitor reference and packed Cordova consumer without bundler aliases.');

mkdirSync(`${base}/tests`, { recursive: true });
for (const name of ['IonicParityTests.swift', 'project.yml']) cpSync(`fixtures/ionic-parity/${name}`, `${base}/tests/${name}`);
