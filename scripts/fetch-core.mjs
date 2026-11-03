import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
const { repository, revision } = JSON.parse(readFileSync('core-source.json', 'utf8'));
if (!/^[a-f0-9]{40}$/.test(revision)) throw new Error('Core revision must be a full commit SHA');
const run = (args) => execFileSync('git', args, { stdio: 'inherit' });
if (!existsSync('.upstream')) run(['clone', '--filter=blob:none', '--no-checkout', repository, '.upstream']);
run(['-C', '.upstream', 'fetch', 'origin', revision]);
run(['-C', '.upstream', 'checkout', '--detach', revision]);
