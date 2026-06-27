const fs = require('fs/promises');
const path = require('path');

const root = path.resolve(__dirname, '..');
const output = path.join(root, '.pages');
const paperBundlePath = path.join(root, 'node_modules', 'paper', 'dist', 'paper-full.min.js');

async function copyIfPresent(source, target) {
  try {
    await fs.copyFile(source, target);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
}

async function copyDirectory(source, target) {
  await fs.mkdir(target, { recursive: true });

  const entries = await fs.readdir(source, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name === '.DS_Store' || entry.name === 'node_modules') {
      continue;
    }

    const sourcePath = path.join(source, entry.name);
    const targetPath = path.join(target, entry.name);

    if (entry.isDirectory()) {
      await copyDirectory(sourcePath, targetPath);
      continue;
    }

    if (entry.isFile()) {
      await fs.copyFile(sourcePath, targetPath);
    }
  }
}

async function buildPages() {
  await fs.rm(output, { recursive: true, force: true });
  await fs.mkdir(output, { recursive: true });

  await fs.copyFile(path.join(root, 'index.html'), path.join(output, 'index.html'));
  await copyDirectory(path.join(root, 'demo'), path.join(output, 'demo'));
  await copyDirectory(path.join(root, 'public'), path.join(output, 'public'));
  await fs.mkdir(path.join(output, 'demo', 'vendor'), { recursive: true });
  await fs.copyFile(paperBundlePath, path.join(output, 'demo', 'vendor', 'paper-full.min.js'));
  await copyIfPresent(path.join(root, 'CNAME'), path.join(output, 'CNAME'));

  console.log(`Built GitHub Pages site in ${path.relative(root, output)}/`);
}

buildPages().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
