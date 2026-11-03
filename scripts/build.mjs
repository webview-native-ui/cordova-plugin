import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import ts from 'typescript';
import { build } from 'esbuild';
import { copyTheme } from './lib/copy-theme.mjs';

const upstream = resolve('.upstream');
const { repository, revision } = JSON.parse(readFileSync('core-source.json', 'utf8'));
const actual = execFileSync('git', ['-C', upstream, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
if (actual !== revision) throw new Error('Core checkout differs from core-source.json; run npm run fetch:core');
const coreInputs = [
  'packages/native-ui-core/src',
  'packages/native-ui-core/android/src/main/java',
  'packages/native-ui-core/ios/Sources/NativeUICore',
  'LICENSE',
];
const changes = execFileSync(
  'git',
  ['-C', upstream, 'status', '--porcelain', '--untracked-files=all', '--ignored=matching', '--', ...coreInputs],
  { encoding: 'utf8' },
).trim();
if (changes)
  throw new Error(
    `Core inputs differ from the pinned commit; commit them upstream and update core-source.json, or restore the inputs before building:\n${changes}`,
  );
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
cpSync(join(upstream, 'packages/native-ui-core/android/src/main/java'), 'shared/android', { recursive: true });
cpSync(join(upstream, 'packages/native-ui-core/ios/Sources/NativeUICore'), 'shared/ios', { recursive: true });
cpSync(join(upstream, 'LICENSE'), 'shared/LICENSE');
const theme = copyTheme();
writeFileSync('shared/ORIGIN.json', JSON.stringify({ repository, revision, theme }, null, 2) + '\n');
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
