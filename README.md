# Paperjs Offset

`paperjs-offset` adds geometry offset helpers for [Paper.js](https://paperjs.org/) paths:

- `offset(path, distance, options)` expands or contracts a path.
- `offsetStroke(path, distance, options)` expands a stroked path into a filled outline.

Paper.js has APIs that accept an `offset` distance along a path, but its public reference still does not expose a native geometry offset API for expanding paths. This package remains a small compatibility library for projects that need Illustrator-style path offsets in Paper.js.

Offsetting complex Bezier paths is inherently lossy and can still produce self-intersections, missing fragments, or imperfect joins in hard cases. If you report a bug, include the source `pathData`, the offset distance, and the options used.

## Install

```sh
npm install paper paperjs-offset
```

## Usage

```javascript
import paper from 'paper';
import { offset, offsetStroke } from 'paperjs-offset';

const path = new paper.Path.Rectangle({
  point: [20, 20],
  size: [120, 80]
});

const expanded = offset(path, 12, { join: 'round' });
const strokeShape = offsetStroke(path, 8, { cap: 'round' });
```

The default `algorithm: 'auto'` runs multiple strategies and returns the result with the best quality score. You can force a strategy when a project needs stable legacy behavior or a specific tradeoff:

```javascript
offset(path, 12, { algorithm: 'robust' });
offset(path, 12, { algorithm: 'legacy' });
```

For browser usage, include Paper.js first and then the generated browser bundle:

```html
<script src="https://cdn.jsdelivr.net/npm/paper@0.12.18/dist/paper-full.min.js"></script>
<script src="./paperjs-offset.js"></script>
```

The browser bundle exposes `window.PaperOffset` and `window.paperjsOffset`:

```javascript
const expanded = PaperOffset.offset(path, 10, { join: 'round' });
const outline = PaperOffset.offsetStroke(path, 10, { cap: 'round' });
```

`PaperOffset` is still exported for older code that prefers the static wrapper:

```javascript
import { PaperOffset } from 'paperjs-offset';

PaperOffset.offset(path, 10);
```

The old prototype-extension API still works, but it is deprecated and no longer ships TypeScript declarations for `paper.Path` or `paper.CompoundPath`:

```typescript
import paper from 'paper';
import ExtendPaperJs from 'paperjs-offset';

ExtendPaperJs(paper);

(path as any).offset(10);
(path as any).offsetStroke(10);
```

## API

```typescript
offset(
  path: paper.Path | paper.CompoundPath,
  distance: number,
  options?: OffsetOptions
): paper.Path | paper.CompoundPath;

offsetStroke(
  path: paper.Path | paper.CompoundPath,
  distance: number,
  options?: OffsetOptions
): paper.Path | paper.CompoundPath;

interface OffsetOptions {
  // Offset join style. Default: 'miter'.
  join?: 'miter' | 'bevel' | 'round';
  // Stroke terminal style for offsetStroke. Default: 'butt'.
  cap?: 'butt' | 'round';
  // Miter limit. Default: 10.
  limit?: number;
  // Offset strategy. Default: 'auto'.
  algorithm?: 'auto' | 'legacy' | 'split' | 'robust';
  // Insert the result into the current project. Default: true.
  insert?: boolean;
}
```

You can inspect a generated result with the same quality scorer used by `algorithm: 'auto'`:

```javascript
import { analyze, offset } from 'paperjs-offset';

const result = offset(path, 12, { insert: false });
const quality = analyze(path, result, 12);
```

## Demos

The demo folder is structured around two entry points:

- [`demo/index.html`](demo/index.html) is a visual gallery with closed-path offsets, join styles, compound-shape cleanup, stroke caps, and a curve stress case.
- [`demo/stress.html`](demo/stress.html) renders the deterministic stress corpus used by `npm run test:stress`.
- [`demo/debug.html`](demo/debug.html) is a small reproduction harness for changing `pathData`, offset distances, and options while debugging issues.

Open either file directly in a browser, or serve the demo folder locally:

```sh
npm run demo:serve
```

The build writes browser bundles to `dist/` first and then copies them into `demo/`, so the demo always exercises the same generated artifact that is published.

![Preview](/public/preview.jpg)

## Development

```sh
npm ci
npm run lint
npm run build
npm run build:ts
npm run build:bundles
npm test
npm run test:stress
```

`npm test` rebuilds the package, runs the smoke tests, and then runs the deterministic stress corpus used by the stress gallery.

## Release

Run the local release check before publishing:

```sh
npm run release:check
```

To publish a new version:

```sh
npm version patch
npm run release:publish
git push origin master --follow-tags
```

`release:publish` delegates to `npm publish`; the `prepublishOnly` lifecycle runs `release:check`, so direct publishes and the local release command share the same guardrails.

The GitHub default branch is currently `master`. GitHub's unprotected-branch warning is independent of the branch name: add a repository ruleset for `master` or `main` that blocks deletion and force pushes.

## License

Distributed under the MIT license. See [LICENSE](https://github.com/glenzli/paperjs-offset/blob/master/LICENSE) for detail.
