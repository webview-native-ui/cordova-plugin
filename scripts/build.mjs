import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import ts from 'typescript';
import { build } from 'esbuild';

const upstream = resolve('node_modules/@rdlabo/capacitor-native-ui');
const manifest = JSON.parse(readFileSync('package.json', 'utf8'));
const revision = manifest.devDependencies['@rdlabo/capacitor-native-ui'].split('#')[1];
for (const path of ['dist', 'www', 'shared']) rmSync(path, { recursive: true, force: true });
function compile(root, output) {
  const options = {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    lib: ['lib.es2020.d.ts', 'lib.dom.d.ts'],
    declaration: true,
    strict: true,
    skipLibCheck: true,
    esModuleInterop: true,
    rootDir: resolve(root),
    outDir: resolve(output),
  };
  const files = ts.sys.readDirectory(root, ['.ts'], ['**/node_modules/**']);
  const program = ts.createProgram(files, options);
  const result = program.emit();
  const errors = [...ts.getPreEmitDiagnostics(program), ...result.diagnostics];
  if (errors.length)
    throw new Error(
      ts.formatDiagnosticsWithColorAndContext(errors, {
        getCanonicalFileName: (x) => x,
        getCurrentDirectory: ts.sys.getCurrentDirectory,
        getNewLine: () => '\n',
      }),
    );
}
compile(join(upstream, 'packages/native-ui-core/src'), 'shared/core');
cpSync(join(upstream, 'android/src/main/java/shared-core'), 'shared/android', { recursive: true });
cpSync(join(upstream, 'packages/native-ui-core/ios/Sources/NativeUICore'), 'shared/ios', { recursive: true });
cpSync(join(upstream, 'LICENSE'), 'shared/LICENSE');
writeFileSync(
  'shared/ORIGIN.json',
  JSON.stringify({ repository: 'https://github.com/webview-native-ui/capacitor-plugin', revision }, null, 2) + '\n',
);
compile('src', 'dist');
mkdirSync('www', { recursive: true });
await build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  format: 'cjs',
  platform: 'browser',
  target: 'es2020',
  outfile: 'www/native-ui.js',
});
console.log(`Built Cordova adapter with shared Core ${revision}`);
