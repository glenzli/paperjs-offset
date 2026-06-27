# paperjs-offset

Offset geometry helpers for [Paper.js](https://paperjs.org/).

[![paperjs-offset preview](public/preview.jpg)](https://glenzli.github.io/paperjs-offset/)

[Open the live demo](https://glenzli.github.io/paperjs-offset/) · [Report an issue](https://github.com/glenzli/paperjs-offset/issues)

Run the live preview locally:

```sh
npm run demo:serve
```

The local server prints and serves:

```txt
http://localhost:4173/
```

Use the named functions for new code:

```ts
import paper from 'paper';
import { analyze, offset, offsetStroke } from 'paperjs-offset';

paper.setup(new paper.Size(400, 300));
```

## Recommended API

```ts
function offset(
  path: paper.Path | paper.CompoundPath,
  distance: number,
  options?: OffsetOptions
): paper.Path | paper.CompoundPath;

function offsetStroke(
  path: paper.Path | paper.CompoundPath,
  distance: number,
  options?: OffsetOptions
): paper.Path | paper.CompoundPath;

function analyze(
  source: paper.Path | paper.CompoundPath,
  result: paper.Path | paper.CompoundPath,
  distance: number,
  options?: { stroke?: boolean }
): OffsetQuality;
```

- `offset(path, distance, options)` expands or contracts a path.
- `offsetStroke(path, distance, options)` converts a stroked centerline into a closed filled outline. The distance is the outline distance from the centerline, so it behaves like half of a stroke width.
- `analyze(source, result, distance, options)` scores generated geometry and reports warnings for hard cases.

All three functions accept `paper.Path` and `paper.CompoundPath`. Results are inserted into the active Paper.js project by default; pass `insert: false` when you want to manage the returned item yourself.

## Install

```sh
npm install paper paperjs-offset
```

`paper` is a peer dependency. The package ships CommonJS, ESM, TypeScript declarations, and browser bundles.

## Quick Start

```ts
import paper from 'paper';
import { offset, offsetStroke } from 'paperjs-offset';

paper.setup(new paper.Size(400, 300));

const source = new paper.Path.Star({
  center: [160, 120],
  points: 8,
  radius1: 70,
  radius2: 36,
  insert: false
});

const expanded = offset(source, 14, {
  join: 'round',
  insert: false
});

const outline = offsetStroke(source, 8, {
  join: 'round',
  cap: 'round',
  insert: false
});
```

## API Patterns

### 1. Offset a Closed Shape

Positive distances expand closed shapes. Negative distances contract them.

```ts
const expanded = offset(source, 18, {
  join: 'round',
  insert: false
});

const contracted = offset(source, -18, {
  join: 'round',
  insert: false
});
```

### 2. Build a Filled Stroke Outline

Use `offsetStroke` for open or closed paths when you need a fillable outline instead of a rendered stroke.

```ts
const openPath = new paper.Path({
  segments: [[20, 80], [90, 30], [160, 80]],
  insert: false
});

const outline = offsetStroke(openPath, 10, {
  join: 'round',
  cap: 'round',
  insert: false
});
```

For open paths, `cap` controls the terminals. For closed paths, the result is still a closed filled outline.

### 3. Inspect Quality

Offsetting Bezier geometry is approximate. Use `analyze` when a shape may contain tight curves, concave joins, self-intersections, or aggressive negative offsets.

```ts
const result = offset(source, -12, {
  join: 'round',
  algorithm: 'auto',
  insert: false
});

const quality = analyze(source, result, -12);

console.log(quality.score, quality.warnings);
```

When inspecting `offsetStroke` output, pass `stroke: true`:

```ts
const outline = offsetStroke(openPath, 10, {
  join: 'round',
  cap: 'round',
  insert: false
});

const quality = analyze(openPath, outline, 10, { stroke: true });
```

## Options

```ts
interface OffsetOptions {
  join?: 'miter' | 'bevel' | 'round';
  cap?: 'butt' | 'round';
  limit?: number;
  insert?: boolean;
  algorithm?: 'auto' | 'adaptive' | 'robust' | 'split' | 'legacy';
}
```

| Option | Default | Applies to | Notes |
| --- | --- | --- | --- |
| `join` | `'miter'` | `offset`, `offsetStroke` | Corner reconstruction style. |
| `cap` | `'butt'` | `offsetStroke` | Terminal style for open paths. |
| `limit` | `10` | `offset`, `offsetStroke` | Miter limit for sharp joins. |
| `insert` | `true` | `offset`, `offsetStroke` | Insert the result into the source parent or active layer. |
| `algorithm` | `'auto'` | `offset`, `offsetStroke` | Strategy selection mode. |

## Algorithms

`algorithm: 'auto'` is the recommended default. It tries the available strategies, scores each candidate with the same quality function exposed by `analyze`, and returns the lowest-scoring result.

`adaptive` is intentionally conservative. When a strict result looks like a miter spike or an over-eroded inward offset, it may choose a safer join or a smaller inward fallback distance. Use `robust`, `split`, or `legacy` when the requested distance must be treated strictly.

| Mode | Use case |
| --- | --- |
| `auto` | Recommended application default. Chooses the best-scored result. |
| `adaptive` | Tries strict robust output first, then safer fallbacks for miter spikes and aggressive inward collapse. |
| `robust` | Extra cleanup for concave joins and self-intersecting stroke outlines. |
| `split` | Splits self-intersecting curves with less cleanup than `robust`. |
| `legacy` | Closest behavior to older releases when preserving historical output matters. |

`OffsetQuality` includes:

```ts
interface OffsetQuality {
  algorithm?: 'auto' | 'adaptive' | 'robust' | 'split' | 'legacy';
  score: number;
  warnings: string[];
  selfIntersections: number;
  containmentErrors: number;
  distanceErrors: number;
  segmentCount: number;
  area: number;
}
```

Warnings can include empty results, non-finite bounds, self-intersections, unexpected area changes, containment errors, center shift, negative offset collapse, and distance collapse.

## Browser Usage

For browser pages, load Paper.js first and then the browser build:

```html
<script src="https://cdn.jsdelivr.net/npm/paper@0.12.18/dist/paper-full.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/paperjs-offset@1/dist/paperjs-offset.min.js"></script>
```

Use the `paperjsOffset` global for the current API:

```js
const expanded = paperjsOffset.offset(path, 12, {
  join: 'round'
});

const outline = paperjsOffset.offsetStroke(path, 8, {
  join: 'round',
  cap: 'round'
});
```

## Demo

[Open the live demo](https://glenzli.github.io/paperjs-offset/) to inspect offset direction, join styles, stroke outlines, compound paths, strategy selection, and quality scoring. The gallery is split into basic, advanced, boundary, and edge-case pages so each page renders a smaller deterministic case set.

Run the demos locally:

```sh
npm run demo:serve
```

The root `index.html` redirects to `demo/index.html`. `npm run build` writes browser bundles to `dist/` and syncs the generated files into `demo/`, so local demos and published artifacts exercise the same build.

## Compatibility API

Older entry points still exist, but new code should prefer the named functions above.

### Static Class

```ts
import { PaperOffset } from 'paperjs-offset';

const expanded = PaperOffset.offset(path, 12, { join: 'round' });
const outline = PaperOffset.offsetStroke(path, 8, { cap: 'round' });
const quality = PaperOffset.analyze(path, expanded, 12);
```

The browser bundle also exposes `window.PaperOffset` as an alias for older scripts.

### Prototype Extension

```ts
import paper from 'paper';
import extendPaperJs from 'paperjs-offset';

extendPaperJs(paper);

const expanded = path.offset(12, { join: 'round' });
const outline = path.offsetStroke(8, { cap: 'round' });
```

This mutates `paper.Path.prototype` and `paper.CompoundPath.prototype`. It remains available for compatibility, but named functions are easier to type, test, and migrate.

## Limitations and Bug Reports

Path offsetting is a geometric approximation problem, especially around Bezier joins, self-intersections, compound paths, and large negative offsets. Difficult shapes can still expose edge cases.

Bug reports are most useful when they include:

- `pathData`
- distance
- options
- whether the operation is `offset` or `offsetStroke`
- expected shape or screenshot
- `analyze(...)` output when available

Report issues at <https://github.com/glenzli/paperjs-offset/issues>.

## Development

```sh
npm ci
npm run lint
npm test
npm run test:stress
npm run test:stress:quick
npm run test:stress:boundary
```

Useful build commands:

```sh
npm run build
npm run build:ts
npm run build:bundles
```

`npm test` rebuilds the package, runs smoke tests, and then runs the full generated stress corpus. Use `test:stress:quick` for the normal gallery groups, and `test:stress:boundary` for the aggressive boundary groups.

## Release

Publishing is intentionally local. There is no GitHub Action that publishes to npm.

```sh
npm version patch
npm run release:check
npm run release:publish
git push origin master --follow-tags
```

`release:check` runs typecheck, tests, `npm audit`, and `npm pack --dry-run`. `release:publish` delegates to `npm publish`; `prepublishOnly` runs the same release check for direct publishes.

## License

MIT. See [LICENSE](LICENSE).
