import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import ts from 'typescript';

// Keep the roles, availability rules and Android palette extraction owned by
// the pinned Capacitor source. Only the host imports and JSON bridge differ.
export function copyDynamicColors(upstream) {
  const source = readFileSync(join(upstream, 'src/dynamic-colors.ts'), 'utf8')
    .replace(
      "import { Capacitor } from '@capacitor/core';",
      "import { nativeUIHost, nativeUIPlugin as corePlugin } from './core/host.js';\nconst plugin = corePlugin as unknown as DynamicColorPlugin;",
    )
    .replace("import { nativeUIPlugin as plugin } from './host.js';\n", '')
    .replace("from '@capacitor/core'", "from './core/host.js'")
    .replaceAll('Capacitor.getPlatform()', 'nativeUIHost.getPlatform()');
  if (source.includes('@capacitor/') || source.includes('Capacitor.')) throw new Error('Review upstream Dynamic Color host imports');
  const options = { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext };
  const declarations = ts.transpileDeclaration(source, { fileName: 'dynamic-colors.ts', compilerOptions: options });
  if (declarations.diagnostics?.length) throw new Error('Dynamic Color declarations need review');
  writeFileSync('shared/dynamic-colors.js', ts.transpileModule(source, { compilerOptions: options }).outputText);
  writeFileSync('shared/dynamic-colors.d.ts', declarations.outputText);
  const native = readFileSync(join(upstream, 'android/src/main/java/dev/rdlabo/capacitor/nativeui/DynamicColorScheme.kt'), 'utf8')
    .replace('import com.getcapacitor.JSObject', 'import org.json.JSONObject')
    .replaceAll('JSObject', 'JSONObject');
  const output = 'shared/android-adapter/DynamicColorScheme.kt';
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, native);
}
