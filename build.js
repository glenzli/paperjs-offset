const { rollup } = require('rollup');
const terser = require('@rollup/plugin-terser');
const pkg = require('./package.json');

const external = ['paper'];
const globals = { paper: 'paper' };
const libraryName = 'paperjsOffset';

async function writeBundle(input, outputs, plugins = []) {
  const bundle = await rollup({ input, external, plugins });

  try {
    await Promise.all(outputs.map((output) => bundle.write(output)));
  } finally {
    await bundle.close();
  }
}

async function build() {
  await Promise.all([
    writeBundle('dist/lib/index.js', [
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
    ]),
    writeBundle('dist/lib/bundle.js', [
      {
        file: 'dist/paperjs-offset.js',
        format: 'iife',
        sourcemap: false,
        globals,
      },
      {
        file: 'demo/paperjs-offset.js',
        format: 'iife',
        sourcemap: false,
        globals,
      },
    ]),
    writeBundle('dist/lib/bundle.js', [
      {
        file: 'dist/paperjs-offset.min.js',
        format: 'iife',
        sourcemap: false,
        globals,
      },
      {
        file: 'demo/paperjs-offset.min.js',
        format: 'iife',
        sourcemap: false,
        globals,
      },
    ], [terser()]),
  ]);
}

build().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
