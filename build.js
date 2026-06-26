const { rollup } = require('rollup');
const terser = require('@rollup/plugin-terser');
const { copyFile } = require('fs/promises');
const pkg = require('./package.json');

const external = ['paper'];
const globals = { paper: 'paper' };
const libraryName = 'paperjsOffset';
const browserBundle = 'dist/paperjs-offset.js';
const minifiedBrowserBundle = 'dist/paperjs-offset.min.js';
const demoBrowserBundle = 'demo/paperjs-offset.js';
const demoMinifiedBrowserBundle = 'demo/paperjs-offset.min.js';

async function writeBundle(input, outputs, plugins = []) {
  const bundle = await rollup({ input, external, plugins });

  try {
    await Promise.all(outputs.map((output) => bundle.write(output)));
  } finally {
    await bundle.close();
  }
}

async function buildLibraryBundles() {
  await writeBundle('dist/lib/index.js', [
    {
      file: pkg.main,
      format: 'umd',
      name: libraryName,
      sourcemap: true,
      exports: 'named',
      globals,
    },
    {
      file: pkg.module,
      format: 'es',
      sourcemap: true,
    },
    {
      file: 'dist/index.es5.js',
      format: 'es',
      sourcemap: true,
    },
  ]);
}

async function buildBrowserBundles() {
  await Promise.all([
    writeBundle('dist/lib/bundle.js', [
      {
        file: browserBundle,
        format: 'iife',
        sourcemap: false,
        globals,
      },
    ]),
    writeBundle('dist/lib/bundle.js', [
      {
        file: minifiedBrowserBundle,
        format: 'iife',
        sourcemap: false,
        globals,
      },
    ], [terser()]),
  ]);
}

async function syncDemoBundles() {
  await Promise.all([
    copyFile(browserBundle, demoBrowserBundle),
    copyFile(minifiedBrowserBundle, demoMinifiedBrowserBundle),
  ]);
}

async function build() {
  await Promise.all([buildLibraryBundles(), buildBrowserBundles()]);
  await syncDemoBundles();
}

build().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
