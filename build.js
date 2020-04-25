const rollup = require('rollup')
const resolve = require('rollup-plugin-node-resolve')
const commonjs = require('rollup-plugin-commonjs')
const sourceMaps = require('rollup-plugin-sourcemaps')
const typescript = require('rollup-plugin-typescript2')
const json = require('rollup-plugin-json')
const camelCase = require('lodash.camelcase')
const uglify = require('rollup-plugin-uglify').uglify
const pkg = require('./package.json')

const libraryName = 'paperjsOffset'

const defaultPlugins = [
  json(),
  typescript({ useTsconfigDeclarationDir: true }),
  commonjs(),
  resolve(),
  sourceMaps(),
]

let tasks = []

tasks.push(rollup.rollup({
  input: 'src/index.ts',
  external: ['paper'],
  plugins: defaultPlugins
}).then(bundle => {
  bundle.write({ format: 'umd', file: pkg.main, name: camelCase(libraryName), sourcemap: true })
  bundle.write({ format: 'es', file: pkg.module, name: camelCase(libraryName), sourcemap: true })
}))

tasks.push(rollup.rollup({
  input: 'src/bundle.ts',
  output: [
    { file: 'dist/paperjs-offset.js', format: 'iife', sourcemap: false },
  ],
  external: ['paper'],
  plugins: defaultPlugins
}).then(bundle => {
  bundle.write({ format: 'iife', file: 'dist/paperjs-offset.js', sourcemap: false })
  bundle.write({ format: 'iife', file: 'demo/paperjs-offset.js', sourcemap: false })
}))

tasks.push(rollup.rollup({
  input: 'src/bundle.ts',
  external: ['paper'],
  plugins: defaultPlugins.concat([uglify()])
}).then(bundle => {
  bundle.write({ format: 'iife', file: 'dist/paperjs-offset.min.js', sourcemap: false })
  bundle.write({ format: 'iife', file: 'demo/paperjs-offset.min.js', sourcemap: false })
}))

Promise.all(tasks).then(() => {
  setTimeout(() => {
    process.exit()
  }, 3000)
})