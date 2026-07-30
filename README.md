# paperjs-offset

![paperjs-offset preview](public/preview.jpg)

Language: [English](#english) | [中文](#中文)

<a id="中文"></a>

## 中文

### 简介

`paperjs-offset` 是 [Paper.js](https://paperjs.org/) 的路径偏移辅助库，用于生成闭合路径偏移、描边轮廓，以及分析偏移结果质量。

项目主页：<https://glenzli.com/projects/paperjs-offset/>

新代码推荐直接使用命名函数：

```ts
import paper from 'paper';
import { analyze, offset, offsetStroke } from 'paperjs-offset';

paper.setup(new paper.Size(400, 300));
```

### 推荐 API

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
  options?: {
    stroke?: boolean;
    join?: 'miter' | 'bevel' | 'round';
    cap?: 'butt' | 'round';
  }
): OffsetQuality;
```

- `offset(path, distance, options)` 用于扩张或收缩路径。
- `offsetStroke(path, distance, options)` 将描边中心线转换成可填充的闭合轮廓。`distance` 是轮廓到中心线的距离，因此效果类似描边宽度的一半。
- `analyze(source, result, distance, options)` 对生成结果做质量评分，并为困难几何场景输出警告。

这三个函数都接受 `paper.Path` 和 `paper.CompoundPath`。默认情况下，结果会插入当前 Paper.js project；如果希望自行管理返回对象，请传入 `insert: false`。

### 安装

```sh
npm install paper paperjs-offset
```

使用这个附加库的应用需要自行安装 `paper`。`paperjs-offset` 不声明运行时依赖；包内提供 CommonJS、ESM、TypeScript 类型声明和浏览器 bundle。

### 快速开始

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

### API 使用模式

#### 1. 偏移闭合图形

正数距离会扩张闭合图形，负数距离会向内收缩。

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

#### 2. 生成可填充的描边轮廓

当你需要一个可填充的轮廓，而不是仅由渲染层绘制的 stroke 时，可以对开放或闭合路径使用 `offsetStroke`。

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

对于开放路径，`cap` 控制端点样式；对于闭合路径，结果仍然是闭合的可填充轮廓。

#### 3. 检查结果质量

Bezier 几何的偏移是近似问题。当图形包含紧凑曲线、凹角、自交，或使用较激进的负向偏移时，可以使用 `analyze` 检查结果质量。

```ts
const result = offset(source, -12, {
  join: 'round',
  algorithm: 'auto',
  insert: false
});

const quality = analyze(source, result, -12, { join: 'round' });

console.log(quality.score, quality.warnings);
```

检查 `offsetStroke` 结果时，请传入 `stroke: true`：

```ts
const outline = offsetStroke(openPath, 10, {
  join: 'round',
  cap: 'round',
  insert: false
});

const quality = analyze(openPath, outline, 10, {
  stroke: true,
  join: 'round',
  cap: 'round'
});
```

### 选项

```ts
interface OffsetOptions {
  join?: 'miter' | 'bevel' | 'round';
  cap?: 'butt' | 'round';
  limit?: number;
  insert?: boolean;
  algorithm?: 'auto' | 'adaptive' | 'robust' | 'split' | 'legacy';
}
```

| 选项 | 默认值 | 适用于 | 说明 |
| --- | --- | --- | --- |
| `join` | `'miter'` | `offset`, `offsetStroke` | 角点重建样式。 |
| `cap` | `'butt'` | `offsetStroke` | 开放路径端点样式。 |
| `limit` | `10` | `offset`, `offsetStroke` | 尖角的 miter 限制。 |
| `insert` | `true` | `offset`, `offsetStroke` | 将结果插入源对象父级或当前 active layer。 |
| `algorithm` | `'auto'` | `offset`, `offsetStroke` | 策略选择模式。 |

### 算法模式

`algorithm: 'auto'` 是推荐默认值。它先生成 `adaptive` 结果；质量检查没有结构性问题时直接返回，只有自交、意外空结果、包含关系错误、负向偏移距离塌缩等信号才会继续尝试其他策略，并返回评分最低的结果。

`adaptive` 会严格保留请求的偏移距离。激进内缩进入临界区时，它会比较请求的 bevel/miter 连接与更安全的 round 连接，避免退化轮廓面积重新增长或在完全消失后重现。

| 模式 | 使用场景 |
| --- | --- |
| `auto` | 推荐的应用默认值，会选择评分最佳的结果。 |
| `adaptive` | 先尝试 robust 结果，再为可能的 miter 尖刺尝试 round join，同时保持请求的偏移距离。 |
| `robust` | 对凹角和自交描边轮廓做额外清理。 |
| `split` | 拆分自交曲线，清理程度低于 `robust`。 |
| `legacy` | 尽量接近旧版本行为，适合需要保持历史输出的场景。 |

`OffsetQuality` 包含：

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

警告可能包括空结果、非有限 bounds、自交、非预期面积变化、包含关系错误、中心偏移和距离坍缩。向 `analyze` 传入实际的 `join`、`cap` 和 `stroke`，可以避免把 bevel 连接或 butt 端点的预期几何误判为距离坍缩。

### 浏览器用法

在浏览器页面中，先加载 Paper.js，再加载浏览器版本的 `paperjs-offset`：

```html
<script src="https://cdn.jsdelivr.net/npm/paper@0.12.18/dist/paper-full.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/paperjs-offset@2/dist/index.umd.min.js"></script>
```

这里使用 `@2` 跟随 v2 的最新兼容版本。如果需要完全可复现的构建，可以 pin 到具体版本，例如 `paperjs-offset@2.1.0`。

使用 `paperjsOffset` 全局对象访问当前 API：

```js
const expanded = paperjsOffset.offset(path, 12, {
  join: 'round'
});

const outline = paperjsOffset.offsetStroke(path, 8, {
  join: 'round',
  cap: 'round'
});
```

### Dev Site Export Contract

本仓库不再维护独立 demo 页面。项目侧只负责导出内容、数据、截图资源和可挂载 runtime，页面布局和路由由外部 dev-site 统一组织。

生成标准输出：

```sh
npm run build:dev-site
```

输出结构：

```text
dist/dev-site/
├── manifest.json
├── app/
│   ├── paper-full.min-<hash>.js
│   ├── paperjs-offset.umd.min-<hash>.js
│   └── paperjs-offset.esm-<hash>.js
├── assets/
│   ├── banner.jpg
│   ├── guide.png
│   ├── gallery.png
│   └── playground.png
├── data/
│   ├── guide.json
│   ├── gallery.json
│   └── playground.json
└── runtime/
    └── paperjs-offset-devsite.esm-<hash>.js
```

`manifest.json` 使用 `dev-site-project@1` schema，声明项目摘要、标签、链接、截图、数据文件、带内容 hash 的 JS 资源和 runtime。`gallery.json` 将精选展示和压力测试 case 导出为确定性的 SVG path fixture，并包含 operation、distance、options 和 expected quality。Gallery 默认先加载轻量 Showcase，其他压力分类在切换 tab 后再渲染。`playground.json` 从 gallery case 派生 preset 和 control schema。

runtime 导出三个挂载函数：

```js
import {
  mountGallery,
  mountGuide,
  mountPlayground
} from './runtime/paperjs-offset-devsite.esm.js';

mountGuide(container, guideData, {
  basePath: '/projects/paperjs-offset/',
  paper,
  paperjsOffset
});
```

示例中的 runtime 路径仅用于说明导出接口。实际集成时应使用 `manifest.runtime`，因为 `build:dev-site` 会为 JS/runtime 文件名加入内容 hash，避免静态缓存命中旧版本。

runtime 不依赖 `window.onload`，只操作传入的 `container`，CSS 类名使用 `po-` 前缀。资源路径均为相对路径，或通过 `basePath` 解析。交互依赖可以通过 `options.paper` 和 `options.paperjsOffset` 传入；如果依赖缺失，dev-site 仍可使用 `assets/*.png` 做静态 fallback。

### 兼容 API

旧入口仍然可用，但新代码应优先使用上面的命名函数。

#### 静态类

```ts
import { PaperOffset } from 'paperjs-offset';

const expanded = PaperOffset.offset(path, 12, { join: 'round' });
const outline = PaperOffset.offsetStroke(path, 8, { cap: 'round' });
const quality = PaperOffset.analyze(path, expanded, 12);
```

浏览器 bundle 也会暴露 `window.PaperOffset`，作为旧脚本的兼容别名。

#### 原型扩展

```ts
import paper from 'paper';
import extendPaperJs from 'paperjs-offset';

extendPaperJs(paper);

const expanded = path.offset(12, { join: 'round' });
const outline = path.offsetStroke(8, { cap: 'round' });
```

这会修改 `paper.Path.prototype` 和 `paper.CompoundPath.prototype`。它仍然保留用于兼容，但命名函数更容易类型标注、测试和迁移。

### 限制和问题反馈

路径偏移本质上是几何近似问题，尤其是在 Bezier 连接、自交、复合路径和大幅负向偏移附近。复杂图形仍然可能暴露边界情况。

反馈问题时，最好包含：

- `pathData`
- 距离
- 选项
- 使用的是 `offset` 还是 `offsetStroke`
- 预期图形或截图
- 如果方便，附上 `analyze(...)` 输出

### 开发

```sh
npm ci
npm run lint
npm test
npm run test:stress
npm run test:stress:quick
npm run test:stress:boundary
npm run test:fuzz
npm run benchmark
```

常用构建命令：

```sh
npm run build
npm run build:ts
npm run build:bundles
```

`npm test` 会重新构建包、运行 smoke tests、完整生成式 stress corpus 和固定 seed 的 fuzz 验证。普通 gallery 分组可使用 `test:stress:quick`，更激进的 boundary 分组可使用 `test:stress:boundary`。`test:fuzz` 默认运行 400 个随机案例，也可用 `node test/fuzz.js --cases=1000 --seed=1592594996` 扩大验证。`npm run benchmark` 会对同一语料输出各算法的总耗时、P50、P95、最大耗时和最慢案例，但不设置容易受机器波动影响的硬性时间门槛。

### 发布

发布流程刻意保持在本地触发；当前没有 GitHub Action 自动发布到 npm。准备发大版本时，先提交普通代码改动，然后运行：

```sh
npm run release:major
```

也可以用 `npm run release:minor` 或 `npm run release:patch`。`release:prepare` 要求 git 工作区干净，会更新 `package.json` 和 `package-lock.json`、运行 `release:check`、提交 `chore: release vX.Y.Z`，并创建 `vX.Y.Z` tag。

确认版本提交和 tag 无误后，再执行真正的发布：

```sh
npm run release:ship
```

`release:ship` 要求当前提交带有匹配当前版本号的 tag，会先检查 `npm whoami` 和 `gh auth status`，再重新运行 `release:check`，然后显式推送当前分支和版本 tag、用官方 npm registry 执行 `npm publish`，最后通过 GitHub CLI 执行 `gh release create --generate-notes`。如果 npm 发布需要 2FA，可以运行 `npm run release:ship -- --otp=123456`。

`release:check` 会运行 typecheck、测试、`npm audit` 和 `npm pack --dry-run --ignore-scripts`。`npm test` 已经先完成构建，因此 pack 校验不依赖 npm lifecycle。直接执行 `npm publish` 时，`prepublishOnly` 也会运行同一套 release check。

### 许可证

MIT。详见 [LICENSE](LICENSE)。

[回到语言切换](#paperjs-offset)

<a id="english"></a>

## English

### Overview

`paperjs-offset` provides offset geometry helpers for [Paper.js](https://paperjs.org/). It generates closed path offsets, filled stroke outlines, and quality reports for generated offset geometry.

Project homepage: <https://glenzli.com/projects/paperjs-offset/>

Use the named functions for new code:

```ts
import paper from 'paper';
import { analyze, offset, offsetStroke } from 'paperjs-offset';

paper.setup(new paper.Size(400, 300));
```

### Recommended API

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
  options?: {
    stroke?: boolean;
    join?: 'miter' | 'bevel' | 'round';
    cap?: 'butt' | 'round';
  }
): OffsetQuality;
```

- `offset(path, distance, options)` expands or contracts a path.
- `offsetStroke(path, distance, options)` converts a stroked centerline into a closed filled outline. The distance is the outline distance from the centerline, so it behaves like half of a stroke width.
- `analyze(source, result, distance, options)` scores generated geometry and reports warnings for hard cases.

All three functions accept `paper.Path` and `paper.CompoundPath`. Results are inserted into the active Paper.js project by default; pass `insert: false` when you want to manage the returned item yourself.

### Install

```sh
npm install paper paperjs-offset
```

Install `paper` in applications that use this addon. `paperjs-offset` does not declare runtime dependencies; the package ships CommonJS, ESM, TypeScript declarations, and browser bundles.

### Quick Start

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

### API Patterns

#### 1. Offset a Closed Shape

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

#### 2. Build a Filled Stroke Outline

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

#### 3. Inspect Quality

Offsetting Bezier geometry is approximate. Use `analyze` when a shape may contain tight curves, concave joins, self-intersections, or aggressive negative offsets.

```ts
const result = offset(source, -12, {
  join: 'round',
  algorithm: 'auto',
  insert: false
});

const quality = analyze(source, result, -12, { join: 'round' });

console.log(quality.score, quality.warnings);
```

When inspecting `offsetStroke` output, pass `stroke: true`:

```ts
const outline = offsetStroke(openPath, 10, {
  join: 'round',
  cap: 'round',
  insert: false
});

const quality = analyze(openPath, outline, 10, {
  stroke: true,
  join: 'round',
  cap: 'round'
});
```

### Options

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

### Algorithms

`algorithm: 'auto'` is the recommended default. It starts with the `adaptive` result and returns it immediately when quality checks find no structural issue. Signals such as self-intersection, an unexpected empty result, containment errors, or inward distance collapse trigger the remaining strategies and lowest-score selection.

`adaptive` preserves the requested offset distance. Near aggressive inward collapse, it compares the requested bevel/miter join with a safer round candidate so a degenerate contour does not regrow or reappear after full erosion.

| Mode | Use case |
| --- | --- |
| `auto` | Recommended application default. Chooses the best-scored result. |
| `adaptive` | Tries robust output first, then a round join for possible miter spikes while preserving the requested distance. |
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

Warnings can include empty results, non-finite bounds, self-intersections, unexpected area changes, containment errors, center shift, and distance collapse. Pass the actual `join`, `cap`, and `stroke` values to `analyze` so expected bevel joins and butt caps are not reported as distance collapse.

### Browser Usage

For browser pages, load Paper.js first and then the browser build:

```html
<script src="https://cdn.jsdelivr.net/npm/paper@0.12.18/dist/paper-full.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/paperjs-offset@2/dist/index.umd.min.js"></script>
```

This uses `@2` to follow the latest compatible v2 release. Pin an exact version such as `paperjs-offset@2.1.0` when you need fully reproducible builds.

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

### Dev Site Export Contract

This repository no longer maintains standalone demo pages. The project exports content, data, screenshots, and mountable runtime modules; the external dev-site owns layout and routing.

Build the standard export:

```sh
npm run build:dev-site
```

Output:

```text
dist/dev-site/
├── manifest.json
├── app/
│   ├── paper-full.min-<hash>.js
│   ├── paperjs-offset.umd.min-<hash>.js
│   └── paperjs-offset.esm-<hash>.js
├── assets/
│   ├── banner.jpg
│   ├── guide.png
│   ├── gallery.png
│   └── playground.png
├── data/
│   ├── guide.json
│   ├── gallery.json
│   └── playground.json
└── runtime/
    └── paperjs-offset-devsite.esm-<hash>.js
```

`manifest.json` uses the `dev-site-project@1` schema and declares project copy, tags, links, screenshots, data files, content-hashed JS assets, and runtime. `gallery.json` exports curated showcases and stress cases as deterministic SVG path fixtures with operation, distance, options, and expected quality metadata. Gallery initially renders the lightweight Showcase; the stress categories render after their tab is selected. `playground.json` derives presets and controls from gallery cases.

The runtime exports three mount functions:

```js
import {
  mountGallery,
  mountGuide,
  mountPlayground
} from './runtime/paperjs-offset-devsite.esm.js';

mountGuide(container, guideData, {
  basePath: '/projects/paperjs-offset/',
  paper,
  paperjsOffset
});
```

The runtime path in this example only documents the exported interface. Integrations should read `manifest.runtime` because `build:dev-site` adds content hashes to JS/runtime filenames to avoid stale static-cache hits.

The runtime does not depend on `window.onload`, only mutates the provided `container`, and prefixes CSS classes with `po-`. Asset paths are relative, or resolved through `basePath`. Interactive rendering can receive dependencies through `options.paper` and `options.paperjsOffset`; if dependencies are missing, the dev-site can still use `assets/*.png` as static fallback.

### Compatibility API

Older entry points still exist, but new code should prefer the named functions above.

#### Static Class

```ts
import { PaperOffset } from 'paperjs-offset';

const expanded = PaperOffset.offset(path, 12, { join: 'round' });
const outline = PaperOffset.offsetStroke(path, 8, { cap: 'round' });
const quality = PaperOffset.analyze(path, expanded, 12);
```

The browser bundle also exposes `window.PaperOffset` as an alias for older scripts.

#### Prototype Extension

```ts
import paper from 'paper';
import extendPaperJs from 'paperjs-offset';

extendPaperJs(paper);

const expanded = path.offset(12, { join: 'round' });
const outline = path.offsetStroke(8, { cap: 'round' });
```

This mutates `paper.Path.prototype` and `paper.CompoundPath.prototype`. It remains available for compatibility, but named functions are easier to type, test, and migrate.

### Limitations and Bug Reports

Path offsetting is a geometric approximation problem, especially around Bezier joins, self-intersections, compound paths, and large negative offsets. Difficult shapes can still expose edge cases.

Bug reports are most useful when they include:

- `pathData`
- distance
- options
- whether the operation is `offset` or `offsetStroke`
- expected shape or screenshot
- `analyze(...)` output when available

### Development

```sh
npm ci
npm run lint
npm test
npm run test:stress
npm run test:stress:quick
npm run test:stress:boundary
npm run test:fuzz
npm run benchmark
```

Useful build commands:

```sh
npm run build
npm run build:ts
npm run build:bundles
```

`npm test` rebuilds the package, runs smoke tests, the full generated stress corpus, and deterministic seeded fuzz validation. Use `test:stress:quick` for the normal gallery groups, and `test:stress:boundary` for the aggressive boundary groups. `test:fuzz` runs 400 random cases by default; use `node test/fuzz.js --cases=1000 --seed=1592594996` for a larger run. `npm run benchmark` reports total, P50, P95, maximum duration, and the slowest cases for each algorithm without enforcing a machine-sensitive timing threshold.

### Release

Publishing is intentionally triggered locally. There is no GitHub Action that publishes to npm. For a major release, commit normal code changes first, then run:

```sh
npm run release:major
```

Use `npm run release:minor` or `npm run release:patch` for smaller releases. `release:prepare` requires a clean git worktree, updates `package.json` and `package-lock.json`, runs `release:check`, commits `chore: release vX.Y.Z`, and creates the `vX.Y.Z` tag.

After verifying the version commit and tag, ship the release:

```sh
npm run release:ship
```

`release:ship` requires the current commit to have the tag matching the current package version. It checks `npm whoami` and `gh auth status`, reruns `release:check`, explicitly pushes the current branch and version tag, publishes to the official npm registry, and runs `gh release create --generate-notes` through the GitHub CLI. If npm publish requires 2FA, run `npm run release:ship -- --otp=123456`.

`release:check` runs typecheck, tests, `npm audit`, and `npm pack --dry-run --ignore-scripts`. `npm test` builds first, so the pack check does not depend on npm lifecycle scripts. Direct `npm publish` also runs the same release check through `prepublishOnly`.

### License

MIT. See [LICENSE](LICENSE).

[Back to language switch](#paperjs-offset)
