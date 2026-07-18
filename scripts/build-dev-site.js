const fs = require('fs/promises');
const crypto = require('crypto');
const path = require('path');
const zlib = require('zlib');
const paper = require('paper');
const pkg = require('../package.json');
const createStressCases = require('../dev-site/fixtures/stress-cases.js');
const { analyze, offset, offsetStroke } = require('../dist/index.cjs');

const root = path.resolve(__dirname, '..');
const output = path.join(root, 'dist', 'dev-site');

const groups = [
  {
    id: 'closed-offset',
    tab: 'basic',
    title: { en: 'Closed polygon offsets', zh: '闭合多边形偏移' },
    description: { en: 'Sharp stars and polygonal inward/outward offsets.', zh: '尖锐星形和多边形的向内、向外偏移。' }
  },
  {
    id: 'smooth-offset',
    tab: 'basic',
    title: { en: 'Smooth curve offsets', zh: '平滑曲线偏移' },
    description: { en: 'Bezier-heavy blobs that stress curve sampling and joins.', zh: '包含大量 Bezier 曲线的形状，用于测试曲线采样和连接。' }
  },
  {
    id: 'compound-offset',
    tab: 'advanced',
    title: { en: 'Compound shapes', zh: '复合形状' },
    description: { en: 'Boolean unions and holes that need path normalization.', zh: '需要路径规范化的布尔合并形状和带孔形状。' }
  },
  {
    id: 'stroke-offset',
    tab: 'advanced',
    title: { en: 'Stroke outlines', zh: '描边轮廓' },
    description: { en: 'Open paths converted to filled outlines with joins and caps.', zh: '开放路径通过连接和端点样式转换成可填充轮廓。' }
  },
  {
    id: 'boundary-offset',
    tab: 'boundary',
    title: { en: 'Boundary closed offsets', zh: '闭合偏移边界 case' },
    description: { en: 'Aggressive spikes, narrow bays, and inward collapse probes.', zh: '更激进的尖刺、窄槽和向内塌缩探针。' }
  },
  {
    id: 'boundary-compound',
    tab: 'boundary',
    title: { en: 'Boundary compound shapes', zh: '复合形状边界 case' },
    description: { en: 'Small holes and tight compound geometry near boolean limits.', zh: '接近布尔极限的小孔和紧凑复合几何。' }
  },
  {
    id: 'boundary-stroke',
    tab: 'boundary',
    title: { en: 'Boundary stroke outlines', zh: '描边轮廓边界 case' },
    description: { en: 'Hairpin turns and near-overlapping stroke outlines.', zh: '发夹形转折和近重叠的描边轮廓。' }
  },
  {
    id: 'edge-case',
    tab: 'edge',
    title: { en: 'Named edge cases', zh: '命名边界 case' },
    description: { en: 'Small repro-style cases kept for targeted regression checks.', zh: '用于定向回归检查的小型复现 case。' }
  }
];

const tabs = [
  { id: 'basic', title: { en: 'Basic', zh: '基础' }, groups: ['closed-offset', 'smooth-offset'] },
  { id: 'advanced', title: { en: 'Advanced', zh: '进阶' }, groups: ['compound-offset', 'stroke-offset'] },
  { id: 'boundary', title: { en: 'Boundary', zh: '边界' }, groups: ['boundary-offset', 'boundary-compound', 'boundary-stroke'] },
  { id: 'edge', title: { en: 'Edge cases', zh: '特殊 case' }, groups: ['edge-case'] }
];

function readJson(file) {
  return fs.readFile(path.join(root, file), 'utf8').then(JSON.parse);
}

function round(value) {
  return Number.isFinite(value) ? Number(value.toFixed(4)) : value;
}

function boundsOf(item) {
  const bounds = item.bounds;
  return {
    x: round(bounds.x),
    y: round(bounds.y),
    width: round(bounds.width),
    height: round(bounds.height)
  };
}

function sourceOf(item) {
  return {
    format: 'svgPath',
    d: item.pathData,
    compound: item instanceof paper.CompoundPath,
    closed: item.closed
  };
}

function normalizeOptions(options) {
  return Object.assign({ algorithm: 'auto' }, options || {});
}

function statusFromQuality(quality) {
  return quality.warnings.length > 0 ? 'warn' : 'pass';
}

function buildGalleryCases() {
  paper.setup(new paper.Size(1600, 1200));
  return createStressCases(paper).map((testCase) => {
    paper.project.clear();
    const source = testCase.draw();
    const options = Object.assign({}, normalizeOptions(testCase.options), { insert: false });
    try {
      const result = testCase.operation === 'stroke'
        ? offsetStroke(source, testCase.distance, options)
        : offset(source, testCase.distance, options);
      const quality = analyze(source, result, testCase.distance, {
        stroke: testCase.operation === 'stroke'
      });
      return {
        id: testCase.id,
        title: testCase.title,
        group: testCase.kind,
        operation: testCase.operation,
        distance: testCase.distance,
        options: normalizeOptions(testCase.options),
        source: sourceOf(source),
        bounds: boundsOf(source),
        expected: {
          status: statusFromQuality(quality),
          score: round(quality.score),
          warnings: quality.warnings,
          selfIntersections: quality.selfIntersections,
          containmentErrors: quality.containmentErrors,
          distanceErrors: quality.distanceErrors,
          segmentCount: quality.segmentCount
        }
      };
    } catch (error) {
      return {
        id: testCase.id,
        title: testCase.title,
        group: testCase.kind,
        operation: testCase.operation,
        distance: testCase.distance,
        options: normalizeOptions(testCase.options),
        source: sourceOf(source),
        bounds: boundsOf(source),
        expected: {
          status: 'fail',
          warnings: ['exception'],
          error: error && error.message ? error.message : String(error)
        }
      };
    }
  });
}

function buildPlayground(source, gallery) {
  const cases = new Map(gallery.cases.map((item) => [item.id, item]));
  return Object.assign({}, source, {
    presetRefs: undefined,
    presets: source.presetRefs.map((preset) => {
      const testCase = cases.get(preset.caseId);
      if (!testCase) {
        throw new Error(`Missing playground case: ${preset.caseId}`);
      }
      return {
        id: preset.id,
        caseId: preset.caseId,
        title: preset.title,
        operation: testCase.operation,
        distance: testCase.distance,
        options: testCase.options,
        source: testCase.source,
        expected: testCase.expected
      };
    })
  });
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (let index = 0; index < buffer.length; index += 1) {
    crc ^= buffer[index];
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const name = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([name, data])), 0);
  return Buffer.concat([length, name, data, crc]);
}

function color(hex, alpha = 255) {
  const value = hex.replace('#', '');
  return [
    parseInt(value.slice(0, 2), 16),
    parseInt(value.slice(2, 4), 16),
    parseInt(value.slice(4, 6), 16),
    alpha
  ];
}

function createRaster(width, height, background) {
  const pixels = Buffer.alloc(width * height * 4);
  for (let index = 0; index < pixels.length; index += 4) {
    pixels[index] = background[0];
    pixels[index + 1] = background[1];
    pixels[index + 2] = background[2];
    pixels[index + 3] = background[3];
  }

  function blend(x, y, rgba) {
    const ix = Math.round(x);
    const iy = Math.round(y);
    if (ix < 0 || iy < 0 || ix >= width || iy >= height) {
      return;
    }
    const offset = (iy * width + ix) * 4;
    const alpha = rgba[3] / 255;
    pixels[offset] = Math.round(rgba[0] * alpha + pixels[offset] * (1 - alpha));
    pixels[offset + 1] = Math.round(rgba[1] * alpha + pixels[offset + 1] * (1 - alpha));
    pixels[offset + 2] = Math.round(rgba[2] * alpha + pixels[offset + 2] * (1 - alpha));
    pixels[offset + 3] = 255;
  }

  function rect(x, y, w, h, rgba) {
    for (let py = Math.max(0, Math.round(y)); py < Math.min(height, Math.round(y + h)); py += 1) {
      for (let px = Math.max(0, Math.round(x)); px < Math.min(width, Math.round(x + w)); px += 1) {
        blend(px, py, rgba);
      }
    }
  }

  function strokeRect(x, y, w, h, rgba, size = 2) {
    rect(x, y, w, size, rgba);
    rect(x, y + h - size, w, size, rgba);
    rect(x, y, size, h, rgba);
    rect(x + w - size, y, size, h, rgba);
  }

  function circle(cx, cy, radius, rgba) {
    const r2 = radius * radius;
    for (let y = Math.floor(cy - radius); y <= Math.ceil(cy + radius); y += 1) {
      for (let x = Math.floor(cx - radius); x <= Math.ceil(cx + radius); x += 1) {
        const dx = x - cx;
        const dy = y - cy;
        if (dx * dx + dy * dy <= r2) {
          blend(x, y, rgba);
        }
      }
    }
  }

  function line(x1, y1, x2, y2, rgba, size = 2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const steps = Math.max(1, Math.ceil(Math.sqrt(dx * dx + dy * dy)));
    for (let index = 0; index <= steps; index += 1) {
      const t = index / steps;
      circle(x1 + dx * t, y1 + dy * t, size, rgba);
    }
  }

  function polyline(points, rgba, size = 2, closed = true) {
    for (let index = 0; index < points.length - 1; index += 1) {
      line(points[index][0], points[index][1], points[index + 1][0], points[index + 1][1], rgba, size);
    }
    if (closed && points.length > 2) {
      line(points[points.length - 1][0], points[points.length - 1][1], points[0][0], points[0][1], rgba, size);
    }
  }

  function polygon(points, fill, stroke, size = 2) {
    const minY = Math.max(0, Math.floor(Math.min(...points.map((point) => point[1]))));
    const maxY = Math.min(height - 1, Math.ceil(Math.max(...points.map((point) => point[1]))));
    const minX = Math.max(0, Math.floor(Math.min(...points.map((point) => point[0]))));
    const maxX = Math.min(width - 1, Math.ceil(Math.max(...points.map((point) => point[0]))));
    for (let y = minY; y <= maxY; y += 1) {
      for (let x = minX; x <= maxX; x += 1) {
        let inside = false;
        for (let i = 0, j = points.length - 1; i < points.length; j = i, i += 1) {
          const pi = points[i];
          const pj = points[j];
          if ((pi[1] > y) !== (pj[1] > y) && x < ((pj[0] - pi[0]) * (y - pi[1])) / (pj[1] - pi[1]) + pi[0]) {
            inside = !inside;
          }
        }
        if (inside) {
          blend(x, y, fill);
        }
      }
    }
    polyline(points, stroke, size, true);
  }

  function grid(step, rgba) {
    for (let x = 0; x <= width; x += step) {
      line(x, 0, x, height, rgba, 1);
    }
    for (let y = 0; y <= height; y += step) {
      line(0, y, width, y, rgba, 1);
    }
  }

  return { pixels, blend, rect, strokeRect, circle, line, polyline, polygon, grid };
}

function star(cx, cy, outer, inner, points, rotation = -Math.PI / 2) {
  const result = [];
  for (let index = 0; index < points * 2; index += 1) {
    const radius = index % 2 === 0 ? outer : inner;
    const angle = rotation + Math.PI * index / points;
    result.push([cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius]);
  }
  return result;
}

function png(width, height, draw) {
  const raster = createRaster(width, height, color('#f8fafc'));
  draw(raster);
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (width * 4 + 1)] = 0;
    raster.pixels.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

async function writeAssets() {
  const assets = path.join(output, 'assets');
  await fs.copyFile(path.join(root, 'public', 'preview.jpg'), path.join(assets, 'banner.jpg'));
  await fs.writeFile(path.join(assets, 'guide.png'), png(1280, 800, (r) => {
    r.grid(36, color('#dbe5ec', 105));
    for (let row = 0; row < 3; row += 1) {
      for (let col = 0; col < 2; col += 1) {
        const x = 72 + col * 568;
        const y = 62 + row * 236;
        r.rect(x, y, 496, 178, color('#ffffff', 230));
        r.strokeRect(x, y, 496, 178, color('#d8e1e8'), 3);
        r.polygon(star(x + 120, y + 90, 58, 28, 7, -1.2 + row * 0.2), color('#14b8a6', 42), color('#172a3a'), 3);
        r.polygon(star(x + 120, y + 90, 78, 38, 7, -1.2 + row * 0.2), color('#e11d48', 26), color('#be123c'), 3);
        r.rect(x + 224, y + 44, 210, 16, color('#172a3a', 120));
        r.rect(x + 224, y + 78, 170, 12, color('#64748b', 110));
        r.rect(x + 224, y + 106, 230, 34, color('#101820', 210));
      }
    }
  }));
  await fs.writeFile(path.join(assets, 'gallery.png'), png(1280, 800, (r) => {
    r.grid(34, color('#dbe5ec', 105));
    for (let row = 0; row < 3; row += 1) {
      for (let col = 0; col < 4; col += 1) {
        const x = 46 + col * 304;
        const y = 50 + row * 238;
        r.rect(x, y, 260, 198, color('#ffffff', 232));
        r.strokeRect(x, y, 260, 198, color('#d8e1e8'), 3);
        r.polygon(star(x + 130, y + 88, 62 - row * 4, 22 + col * 2, 5 + ((row + col) % 4)), color('#14b8a6', 35), color('#172a3a'), 3);
        r.polygon(star(x + 130, y + 88, 78 - row * 4, 34 + col * 2, 5 + ((row + col) % 4)), color('#e11d48', 25), color('#be123c'), 3);
        r.rect(x + 28, y + 164, 136, 12, color('#172a3a', 130));
      }
    }
  }));
  await fs.writeFile(path.join(assets, 'playground.png'), png(1280, 800, (r) => {
    r.grid(38, color('#dbe5ec', 105));
    r.rect(70, 70, 338, 650, color('#ffffff', 234));
    r.strokeRect(70, 70, 338, 650, color('#d8e1e8'), 3);
    [130, 218, 306, 394, 482, 570].forEach((y, index) => {
      r.rect(112, y, 122, 14, color('#172a3a', 90));
      r.rect(112, y + 28, 244, 34, color(index % 2 ? '#0f766e' : '#2563eb', 42));
      r.strokeRect(112, y + 28, 244, 34, color('#d8e1e8'), 2);
    });
    r.rect(456, 70, 754, 650, color('#ffffff', 234));
    r.strokeRect(456, 70, 754, 650, color('#d8e1e8'), 3);
    r.polygon(star(834, 390, 230, 96, 8), color('#e11d48', 34), color('#be123c'), 6);
    r.polygon(star(834, 390, 172, 72, 8), color('#14b8a6', 45), color('#172a3a'), 5);
    r.rect(590, 644, 488, 18, color('#172a3a', 100));
  }));
}

async function writeJson(file, value) {
  await fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`);
}

function contentHash(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex').slice(0, 12);
}

function hashedName(filename, buffer) {
  const ext = path.extname(filename);
  const basename = filename.slice(0, -ext.length);
  return `${basename}-${contentHash(buffer)}${ext}`;
}

async function copyHashedFile(source, targetDir, filename) {
  const buffer = await fs.readFile(source);
  const outputName = hashedName(filename, buffer);
  await fs.writeFile(path.join(targetDir, outputName), buffer);
  return outputName;
}

async function copyApp() {
  const appDir = path.join(output, 'app');
  const [paper, umd, esm] = await Promise.all([
    copyHashedFile(
      path.join(root, 'node_modules', 'paper', 'dist', 'paper-full.min.js'),
      appDir,
      'paper-full.min.js'
    ),
    copyHashedFile(
      path.join(root, 'dist', 'index.umd.min.js'),
      appDir,
      'paperjs-offset.umd.min.js'
    ),
    copyHashedFile(
      path.join(root, 'dist', 'index.mjs'),
      appDir,
      'paperjs-offset.esm.js'
    )
  ]);
  return {
    scripts: [`app/${paper}`, `app/${umd}`],
    modules: [`app/${esm}`]
  };
}

async function copyRuntime() {
  const filename = await copyHashedFile(
    path.join(root, 'dev-site', 'runtime', 'paperjs-offset-devsite.esm.js'),
    path.join(output, 'runtime'),
    'paperjs-offset-devsite.esm.js'
  );
  return `runtime/${filename}`;
}

async function build() {
  await fs.rm(output, { recursive: true, force: true });
  await Promise.all([
    fs.mkdir(path.join(output, 'app'), { recursive: true }),
    fs.mkdir(path.join(output, 'assets'), { recursive: true }),
    fs.mkdir(path.join(output, 'data'), { recursive: true }),
    fs.mkdir(path.join(output, 'runtime'), { recursive: true })
  ]);

  const guide = await readJson('dev-site/content/guide.json');
  const playgroundSource = await readJson('dev-site/content/playground.json');
  const gallery = {
    schema: 'paperjs-offset-gallery@1',
    title: { en: 'Offset gallery', zh: '偏移 Gallery' },
    summary: {
      en: 'Deterministic stress cases exported as SVG path fixtures with expected quality metadata.',
      zh: '以 SVG path fixture 和预期质量元数据导出的确定性压力 case。'
    },
    defaultTab: 'basic',
    tabs,
    groups,
    cases: buildGalleryCases()
  };
  const playground = buildPlayground(playgroundSource, gallery);
  const [app, runtime] = await Promise.all([
    copyApp(),
    copyRuntime()
  ]);
  const manifest = {
    schema: 'dev-site-project@1',
    slug: 'paperjs-offset',
    title: 'paperjs-offset',
    version: pkg.version,
    summary: {
      zh: 'Paper.js 路径偏移辅助库：闭合路径偏移、描边轮廓和结果质量分析。',
      en: 'Path offset helpers for Paper.js: closed offsets, filled stroke outlines, and result-quality analysis.'
    },
    category: 'library',
    tags: ['geometry', 'paperjs', 'typescript'],
    stack: ['Paper.js', 'TypeScript', 'Geometry'],
    links: {
      homepage: 'https://glenzli.com/projects/paperjs-offset/',
      github: 'https://github.com/glenzli/paperjs-offset',
      gitlab: 'https://gitlab.com/glenzli/paperjs-offset',
      npm: 'https://www.npmjs.com/package/paperjs-offset'
    },
    app,
    assets: {
      cover: 'assets/banner.jpg',
      screenshots: [
        { id: 'guide', src: 'assets/guide.png', ratio: '16:10' },
        { id: 'gallery', src: 'assets/gallery.png', ratio: '16:10' },
        { id: 'playground', src: 'assets/playground.png', ratio: '16:10' }
      ]
    },
    data: {
      guide: 'data/guide.json',
      gallery: 'data/gallery.json',
      playground: 'data/playground.json'
    },
    runtime,
    sections: [
      { type: 'markdown', id: 'intro' },
      { type: 'guide', data: 'data/guide.json', runtime },
      { type: 'playground', data: 'data/playground.json', runtime },
      { type: 'gallery', data: 'data/gallery.json', runtime }
    ]
  };

  await Promise.all([
    writeAssets(),
    writeJson(path.join(output, 'manifest.json'), manifest),
    writeJson(path.join(output, 'data', 'guide.json'), guide),
    writeJson(path.join(output, 'data', 'gallery.json'), gallery),
    writeJson(path.join(output, 'data', 'playground.json'), playground)
  ]);

  console.log(`Built dev-site contract in ${path.relative(root, output)}/`);
}

build().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
