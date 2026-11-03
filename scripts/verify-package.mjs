import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, rmSync, existsSync, readdirSync, mkdirSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';
import { build } from 'esbuild';
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
  assert(!manifest.dependencies['@rdlabo/ionic-theme-ios27']);
  const xml = readFileSync(join(root, 'plugin.xml'), 'utf8');
  assert(xml.includes(`id="${manifest.cordova.id}"`));
  assert(xml.includes(`version="${manifest.version}"`));
  const definitions = ts.createSourceFile(
    'definitions.ts',
    readFileSync('.upstream/packages/native-ui-core/src/native/definitions.ts', 'utf8'),
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
  for (const entry of Object.values(manifest.exports)) {
    const paths = typeof entry === 'string' ? [entry] : Object.values(entry);
    for (const path of paths) assert(existsSync(join(root, path.split('*')[0])), path);
  }
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
  verifyTree('.upstream/packages/native-ui-core/android/src/main/java', join(root, 'shared/android'));
  verifyTree('.upstream/packages/native-ui-core/ios/Sources/NativeUICore', join(root, 'shared/ios'));
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
  // Resolve the public package entries from the packed archive with no aliases.
  const ionicPeer = join(root, 'node_modules/@ionic/core');
  mkdirSync(dirname(ionicPeer), { recursive: true });
  symlinkSync(resolve('node_modules/@ionic/core'), ionicPeer, 'dir');
  const consumer = join(temporary, 'consumer');
  mkdirSync(dirname(join(consumer, 'node_modules', manifest.name)), { recursive: true });
  symlinkSync(root, join(consumer, 'node_modules', manifest.name), 'dir');
  const themeBuild = await build({
    stdin: {
      contents: `
        import { enableNativeUI } from '${manifest.name}';
        import { iosTransitionAnimation, attachTabBarSearchable } from '${manifest.name}/theme';
        import '${manifest.name}/theme/css/ionic-theme-ios27.css';
        globalThis.packageSmoke = { enableNativeUI, iosTransitionAnimation, attachTabBarSearchable };
      `,
      resolveDir: consumer,
      loader: 'ts',
    },
    bundle: true,
    platform: 'browser',
    format: 'esm',
    write: false,
    outdir: join(temporary, 'bundle'),
    metafile: true,
    logLevel: 'silent',
  });
  const integrations = Object.keys(themeBuild.metafile.inputs).filter((path) => path.endsWith('native-integration/index.js'));
  assert.equal(integrations.length, 1, 'Packed theme and Cordova must share exactly one integration module');
  assert(
    !Object.keys(themeBuild.metafile.inputs).some((path) =>
      /node_modules\/(?:@capacitor|@rdlabo\/(?:capacitor-native-ui|ionic-theme-ios27))\//.test(path),
    ),
  );
  const declaration = join(consumer, 'consumer.ts');
  writeFileSync(
    declaration,
    `import { enableNativeUI } from '${manifest.name}';\nimport { iosTransitionAnimation, attachTabBarSearchable } from '${manifest.name}/theme';\nvoid [enableNativeUI, iosTransitionAnimation, attachTabBarSearchable];\n`,
  );
  const program = ts.createProgram([declaration], {
    noEmit: true,
    skipLibCheck: true,
    strict: true,
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
  });
  const errors = ts.getPreEmitDiagnostics(program);
  assert.equal(
    errors.length,
    0,
    ts.formatDiagnosticsWithColorAndContext(errors, {
      getCanonicalFileName: (x) => x,
      getCurrentDirectory: () => consumer,
      getNewLine: () => '\n',
    }),
  );
  assert(existsSync(join(root, 'shared/theme/LICENSE')));
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
  assert.equal(origin.revision, JSON.parse(readFileSync('core-source.json', 'utf8')).revision);
  assert.equal(origin.theme.version, manifest.devDependencies['@rdlabo/ionic-theme-ios27']);
  console.log('Cordova archive resources, bundled API, Core provenance and native sources verified.');
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
