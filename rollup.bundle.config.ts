import resolve from 'rollup-plugin-node-resolve'
import commonjs from 'rollup-plugin-commonjs'
import sourceMaps from 'rollup-plugin-sourcemaps'
import typescript from 'rollup-plugin-typescript2'
import json from 'rollup-plugin-json'
// import { uglify } from 'rollup-plugin-uglify'

//tslint:disable
export default {
  input: `src/bundle.ts`,
  output: [
    { file: 'dist/paperjs-offset.min.js', format: 'iife', sourcemap: false },
    { file: 'demo/paperjs-offset.min.js', format: 'iife', sourcemap: false },
  ],
  // Indicate here external modules you don't wanna include in your bundle (i.e.: 'lodash')
  external: ['paper'],
  watch: {
    include: 'src/**',
  },
  plugins: [
    // Allow json resolution
    json(),
    // Compile TypeScript files
    typescript({ useTsconfigDeclarationDir: true }),
    // Allow bundling cjs modules (unlike webpack, rollup doesn't understand cjs)
    commonjs(),
    // Allow node_modules resolution, so you can use 'external' to control
    // which external modules to include in the bundle
    // https://github.com/rollup/rollup-plugin-node-resolve#usage
    resolve(),

    // Resolve source maps to the original source
    sourceMaps(),

    // Uglify
    // uglify(),
  ],
}
