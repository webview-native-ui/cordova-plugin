import { cpSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

export function copyTheme() {
  const input = resolve('node_modules/@rdlabo/ionic-theme-ios27');
  const output = resolve('shared/theme');
  const source = JSON.parse(readFileSync(join(input, 'package.json'), 'utf8'));
  const expected = JSON.parse(readFileSync('package.json', 'utf8')).devDependencies[source.name];
  if (source.version !== expected) throw new Error(`Expected theme ${expected}, got ${source.version}`);
  let rewritten = 0;
  function copy(directory, destination) {
    mkdirSync(destination, { recursive: true });
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const from = join(directory, entry.name);
      const to = join(destination, entry.name);
      if (entry.isDirectory()) copy(from, to);
      else if (/\.(js|d\.ts|css)$/.test(entry.name)) {
        let contents = readFileSync(from, 'utf8');
        const integration = relative(dirname(to), resolve('shared/core/native-integration/index.js')).split('\\').join('/');
        contents = contents.replace(/(['"])@rdlabo\/capacitor-native-ui\/integration\1/g, () => {
          rewritten++;
          return JSON.stringify(integration.startsWith('.') ? integration : `./${integration}`);
        });
        if (contents.includes('@rdlabo/capacitor-native-ui')) throw new Error(`Unsupported Capacitor import in ${from}`);
        // Upstream maps refer to source files not shipped in this generated copy.
        contents = contents.replace(/^\/\/# sourceMappingURL=.*$/gm, '');
        writeFileSync(to, contents);
      }
    }
  }
  copy(join(input, 'dist'), output);
  if (!rewritten) throw new Error('Theme integration imports were not found; review the upstream layout');
  cpSync(join(input, 'LICENSE'), join(output, 'LICENSE'));
  return { package: source.name, version: source.version };
}
