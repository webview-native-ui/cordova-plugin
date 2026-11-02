import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, existsSync, readdirSync, mkdirSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';
import { actions } from '../dist/transport.js';
const temporary = mkdtempSync(join(tmpdir(), 'cordova-native-ui-package-'));
try {
  const [archive] = JSON.parse(
    execFileSync('npm', ['pack', '--ignore-scripts', '--json', '--pack-destination', temporary], { encoding: 'utf8' }),
  );
  execFileSync('tar', ['-xzf', join(temporary, archive.filename), '-C', temporary]);
  const root = join(temporary, 'package');
  const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  assert(!manifest.dependencies['@rdlabo/capacitor-native-ui']);
  const xml = readFileSync(join(root, 'plugin.xml'), 'utf8');
  assert(xml.includes(`id="${manifest.cordova.id}"`));
  assert(xml.includes(`version="${manifest.version}"`));
  const definitions = ts.createSourceFile(
    'definitions.ts',
    readFileSync('node_modules/@rdlabo/capacitor-native-ui/packages/native-ui-core/src/native/definitions.ts', 'utf8'),
    ts.ScriptTarget.Latest,
    true,
  );
  const contract = definitions.statements.find((node) => ts.isInterfaceDeclaration(node) && node.name.text === 'NativeUIPlugin');
  const expectedActions = [
    ...new Set(contract.members.map((member) => member.name.getText()).filter((name) => name !== 'addListener')),
  ].sort();
  assert.deepEqual([...actions].sort(), expectedActions, 'Cordova commands must cover the shared transport contract');
  const swift = readFileSync(join(root, 'src/ios/NativeUIPlugin.swift'), 'utf8');
  for (const action of actions) assert(swift.includes(`func ${action}(`), `Missing Swift action: ${action}`);
  for (const [, path] of xml.matchAll(/<(?:source-file|js-module|framework)\b[^>]*\bsrc="([^"]+)"/g)) {
    assert(existsSync(join(root, path)), `Missing plugin resource ${path}`);
  }
  for (const entry of Object.values(manifest.exports)) for (const path of Object.values(entry)) assert(existsSync(join(root, path)), path);
  function verifyTree(expected, actual) {
    const entries = readdirSync(expected, { withFileTypes: true });
    assert.deepEqual(readdirSync(actual).sort(), entries.map((entry) => entry.name).sort());
    for (const entry of entries) {
      const input = join(expected, entry.name);
      const output = join(actual, entry.name);
      if (entry.isDirectory()) verifyTree(input, output);
      else assert.equal(readFileSync(output, 'utf8'), readFileSync(input, 'utf8'), output);
    }
  }
  verifyTree('node_modules/@rdlabo/capacitor-native-ui/android/src/main/java/shared-core', join(root, 'shared/android'));
  verifyTree('node_modules/@rdlabo/capacitor-native-ui/packages/native-ui-core/ios/Sources/NativeUICore', join(root, 'shared/ios'));
  for (const name of Object.keys(manifest.dependencies)) {
    const target = join(root, 'node_modules', name);
    mkdirSync(dirname(target), { recursive: true });
    symlinkSync(resolve('node_modules', name), target, 'dir');
  }
  execFileSync(
    process.execPath,
    [
      '--input-type=module',
      '-e',
      `
    import assert from 'node:assert/strict';
    const api = await import(${JSON.stringify(pathToFileURL(join(root, 'dist/core.js')).href)});
    const handle = await api.enableNativeUI({ controls: false });
    assert.equal(handle.getStatus().state, 'web');
    await handle.destroy();
    const ionic = await import(${JSON.stringify(pathToFileURL(join(root, 'dist/index.js')).href)});
    assert.equal(typeof ionic.enableNativeUI, 'function');
  `,
    ],
    { stdio: 'inherit' },
  );
  const module = { exports: {} };
  vm.runInNewContext(readFileSync(join(root, 'www/native-ui.js'), 'utf8'), {
    module,
    exports: module.exports,
    console,
    setTimeout,
    clearTimeout,
  });
  assert.equal(typeof module.exports.enableNativeUI, 'function');
  assert.equal(typeof module.exports.defineNativeUI, 'function');
  const origin = JSON.parse(readFileSync(join(root, 'shared/ORIGIN.json'), 'utf8'));
  assert.equal(origin.revision, manifest.devDependencies['@rdlabo/capacitor-native-ui'].split('#')[1]);
  console.log('Cordova archive resources, bundled API, Core provenance and native sources verified.');
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
