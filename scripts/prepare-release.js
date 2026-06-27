const { execFileSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const versionArg = process.argv[2];
const extraArgs = process.argv.slice(3);
const allowedVersionArgs = new Set([
  'major',
  'minor',
  'patch',
  'premajor',
  'preminor',
  'prepatch',
  'prerelease',
]);

function usage() {
  console.log('Usage: npm run release:prepare -- <major|minor|patch|x.y.z> [npm-version-args]');
}

function run(command, args) {
  console.log(`> ${command} ${args.join(' ')}`);
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

function output(command, args) {
  return execFileSync(command, args, {
    cwd: root,
    encoding: 'utf8',
  }).trim();
}

function assertCleanWorktree() {
  const status = output('git', ['status', '--porcelain']);

  if (status) {
    console.error('Release preparation requires a clean git worktree.');
    console.error(status);
    process.exit(1);
  }
}

function isVersionArg(value) {
  return allowedVersionArgs.has(value) || /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/.test(value);
}

if (!versionArg || versionArg === '--help' || versionArg === '-h') {
  usage();
  process.exit(versionArg ? 0 : 1);
}

if (!isVersionArg(versionArg)) {
  console.error(`Unsupported release version argument: ${versionArg}`);
  usage();
  process.exit(1);
}

assertCleanWorktree();

run('npm', ['version', versionArg, '--no-git-tag-version', ...extraArgs]);

const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const tag = `v${pkg.version}`;

try {
  output('git', ['rev-parse', '--verify', `refs/tags/${tag}`]);
  console.error(`Tag ${tag} already exists.`);
  process.exit(1);
} catch (error) {
  if (error.status !== 1 && error.status !== 128) {
    throw error;
  }
}

run('npm', ['run', 'release:check']);
run('git', ['add', 'package.json', 'package-lock.json']);
run('git', ['commit', '-m', `chore: release ${tag}`]);
run('git', ['tag', '-a', tag, '-m', tag]);

console.log(`Prepared ${tag}. Run npm run release:ship when ready to publish.`);
