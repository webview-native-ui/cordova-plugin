import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
// Registry/archive installs already contain generated assets; Git installs build them.
if (!existsSync('www/native-ui.js') || !existsSync('shared/ORIGIN.json')) {
  execFileSync('npm', ['run', 'build'], { stdio: 'inherit' });
}
