const { execFileSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const tag = `v${pkg.version}`;
const publishArgs = process.argv.slice(2);
const githubRemote = process.env.GITHUB_REMOTE || 'github';

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
    console.error('Release shipping requires a clean git worktree.');
    console.error(status);
    process.exit(1);
  }
}

function assertTagPointsAtHead() {
  const tags = output('git', ['tag', '--points-at', 'HEAD']).split(/\s+/).filter(Boolean);

  if (!tags.includes(tag)) {
    console.error(`Current commit must be tagged ${tag} before shipping.`);
    console.error('Run npm run release:prepare -- <major|minor|patch> first.');
    process.exit(1);
  }
}

assertCleanWorktree();
assertTagPointsAtHead();

run('npm', ['whoami', '--registry=https://registry.npmjs.org']);
run('npm', ['run', 'release:check']);
run('git', ['push', githubRemote, 'HEAD']);
run('git', ['push', githubRemote, tag]);
run('npm', ['run', 'release:publish', '--', ...publishArgs]);
run('gh', ['release', 'create', tag, '--verify-tag', '--generate-notes', '--title', tag]);

console.log(`Published ${tag} to npm and GitHub Releases.`);
