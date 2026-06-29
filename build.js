const { rollup } = require('rollup');
const terser = require('@rollup/plugin-terser');
const pkg = require('./package.json');

const external = ['paper'];
const globals = { paper: 'paper' };
const libraryName = 'paperjsOffset';
const umdBundle = 'dist/index.umd.js';
const minifiedUmdBundle = 'dist/index.umd.min.js';
const browserCompatibilityFooter = `
;(function(global) {
  if (!global || !global.paperjsOffset) return;
  global.PaperOffset = global.paperjsOffset;
  if (global.paper && typeof global.paperjsOffset.default === 'function') {
    global.paperjsOffset.default(global.paper);
  }
})(typeof globalThis !== 'undefined' ? globalThis : typeof self !== 'undefined' ? self : this);
`;

async function writeBundle(input, outputs, plugins = []) {
  const bundle = await rollup({ input, external, plugins });

  try {
    await Promise.all(outputs.map((output) => bundle.write(output)));
  } finally {
    await bundle.close();
  }
}

async function buildLibraryBundles() {
  await writeBundle('.build/lib/index.js', [
    {
      file: 'dist/index.cjs',
      format: 'cjs',
      sourcemap: true,
      exports: 'named',
    },
    {
      file: umdBundle,
      format: 'umd',
      name: libraryName,
      sourcemap: true,
      exports: 'named',
      globals,
      footer: browserCompatibilityFooter,
    },
    {
      file: pkg.module,
      format: 'es',
      sourcemap: true,
    },
  ]);
}

async function buildBrowserBundles() {
  await writeBundle('.build/lib/index.js', [
    {
      file: minifiedUmdBundle,
      format: 'umd',
      name: libraryName,
      sourcemap: false,
      exports: 'named',
      globals,
      footer: browserCompatibilityFooter,
    },
  ], [terser()]);
}

async function build() {
  await Promise.all([buildLibraryBundles(), buildBrowserBundles()]);
}

build().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
