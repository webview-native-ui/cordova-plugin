import { execFileSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
const platform = process.argv[2];
if (!['ios', 'android'].includes(platform)) throw new Error('Usage: node scripts/verify-native.mjs ios|android');
const root = process.cwd();
const temporary = mkdtempSync(join(tmpdir(), `cordova-native-ui-${platform}-`));
const app = join(temporary, 'app');
const cordova = resolve('node_modules/cordova/bin/cordova');
const run = (command, args, cwd = app) => execFileSync(command, args, { cwd, stdio: 'inherit' });
run(process.execPath, [cordova, 'create', app, 'dev.rdlabo.nativeuitest', 'NativeUITest'], temporary);
let config = readFileSync(join(app, 'config.xml'), 'utf8');
config = config.replace(
  '</widget>',
  `
  <preference name="deployment-target" value="15.0" />
  <preference name="GradlePluginKotlinEnabled" value="true" />
  <preference name="GradlePluginKotlinVersion" value="2.2.20" />
  <preference name="AndroidGradlePluginVersion" value="8.13.0" />
  <preference name="AndroidJavaSourceCompatibility" value="21" />
  <preference name="AndroidJavaTargetCompatibility" value="21" />
  <preference name="AndroidKotlinJVMTarget" value="21" />
</widget>`,
);
writeFileSync(join(app, 'config.xml'), config);
cpSync(resolve('fixtures/www'), join(app, 'www'), { recursive: true });
const [archive] = JSON.parse(
  execFileSync('npm', ['pack', '--ignore-scripts', '--json', '--pack-destination', temporary], { cwd: root, encoding: 'utf8' }),
);
const unpacked = join(temporary, 'unpacked');
mkdirSync(unpacked);
run('tar', ['-xzf', join(temporary, archive.filename), '-C', unpacked], temporary);
const version = JSON.parse(readFileSync('package.json', 'utf8')).devDependencies[`cordova-${platform}`];
run(process.execPath, [cordova, 'platform', 'add', `${platform}@${version}`]);
run(process.execPath, [cordova, 'plugin', 'add', join(unpacked, 'package')]);
run(process.execPath, [cordova, 'prepare', platform]);
console.log(`Acceptance app: ${app}`);
if (platform === 'android') {
  run(process.env.NATIVE_UI_GRADLE || 'gradle', ['-p', 'platforms/android', ':app:assembleDebug']);
  if (!existsSync(join(app, 'platforms/android/app/build/tmp/kotlin-classes/debug/dev/rdlabo/cordova/nativeui/NativeUIPlugin.class')))
    throw new Error('Cordova Kotlin adapter was not compiled');
} else {
  run('xcodebuild', [
    '-workspace',
    'platforms/ios/App.xcworkspace',
    '-scheme',
    'App',
    '-configuration',
    'Debug',
    '-destination',
    'generic/platform=iOS Simulator',
    '-derivedDataPath',
    join(temporary, 'DerivedData'),
    'CODE_SIGNING_ALLOWED=NO',
    'build',
  ]);
}
console.log(`Native ${platform} archive installation and application build passed: ${app}`);
