import { cpSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { build } from 'esbuild';
const source = '.upstream/examples/native-ui-html';
const output = 'artifacts/parity/www';
mkdirSync(output, { recursive: true });
const html = readFileSync(`${source}/index.html`, 'utf8').replace(
  '<script type="module" src="./main.js"></script>',
  '<script src="cordova.js"></script><script src="./main.js"></script>',
);
writeFileSync(`${output}/index.html`, html);
const original = readFileSync(`${source}/main.ts`, 'utf8');
const [imports, ...body] = original.split('\n');
const contents = `${imports.replace('@rdlabo/capacitor-native-ui/core', './dist/core.js')}\ndocument.addEventListener('deviceready', () => {\n${body.join('\n')}\n});`;
await build({
  stdin: { contents, resolveDir: resolve('.'), loader: 'ts' },
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: 'es2020',
  outfile: `${output}/main.js`,
});
console.log(`Capacitor HTML sample prepared for Cordova: ${output}`);

const capacitor = 'artifacts/parity/capacitor';
mkdirSync(`${capacitor}/www`, { recursive: true });
cpSync(`${source}/index.html`, `${capacitor}/www/index.html`);
cpSync(`${source}/main.ts`, `${capacitor}/main.ts`);
writeFileSync(
  `${capacitor}/package.json`,
  JSON.stringify(
    {
      name: 'native-ui-parity-capacitor',
      version: '1.0.0',
      private: true,
      type: 'module',
      scripts: { build: 'esbuild main.ts --bundle --format=esm --outfile=www/main.js' },
      dependencies: {
        '@capacitor/core': '8.5.2',
        '@capacitor/ios': '8.5.2',
        '@capacitor/android': '8.5.2',
        '@capacitor/cli': '8.5.2',
        '@rdlabo/capacitor-native-ui': 'file:../../../.upstream',
      },
    },
    null,
    2,
  ) + '\n',
);
writeFileSync(
  `${capacitor}/capacitor.config.json`,
  JSON.stringify({ appId: 'dev.rdlabo.nativeui.parity.capacitor', appName: 'NativeUIParityCapacitor', webDir: 'www' }, null, 2) + '\n',
);
mkdirSync('artifacts/parity/tests', { recursive: true });
cpSync('fixtures/ios-parity/NativeUIParityTests.swift', 'artifacts/parity/tests/NativeUIParityTests.swift');
cpSync('fixtures/ios-parity/project.yml', 'artifacts/parity/tests/project.yml');
