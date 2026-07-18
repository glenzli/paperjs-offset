const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const output = path.join(root, 'dist', 'dev-site');

function readJson(file) {
  return JSON.parse(fs.readFileSync(path.join(output, file), 'utf8'));
}

function assertRelativePath(value, label) {
  assert.strictEqual(typeof value, 'string', `${label} should be a string`);
  assert.ok(value.length > 0, `${label} should not be empty`);
  assert.ok(!value.startsWith('/'), `${label} should be relative`);
  assert.ok(!/^[a-z]+:\/\//i.test(value), `${label} should not be absolute URL`);
}

function assertHashedJsPath(value, label) {
  assertRelativePath(value, label);
  assert.ok(/-[0-9a-f]{12}\.js$/.test(value), `${label} should include a content hash`);
  assert.ok(fs.existsSync(path.join(output, value)), `${label} should exist`);
}

function assertPng(file) {
  const buffer = fs.readFileSync(path.join(output, file));
  assert.deepStrictEqual(Array.from(buffer.slice(0, 8)), [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], `${file} should be a PNG`);
}

function assertJpeg(file) {
  const buffer = fs.readFileSync(path.join(output, file));
  assert.deepStrictEqual(Array.from(buffer.slice(0, 3)), [0xff, 0xd8, 0xff], `${file} should be a JPEG`);
}

(async function run() {
  const manifest = readJson('manifest.json');
  const guide = readJson('data/guide.json');
  const gallery = readJson('data/gallery.json');
  const playground = readJson('data/playground.json');

  assert.strictEqual(manifest.schema, 'dev-site-project@1');
  assert.strictEqual(manifest.slug, 'paperjs-offset');
  assertHashedJsPath(manifest.runtime, 'runtime');
  assert.strictEqual(guide.cards.length, 6, 'guide should export six cards');
  assert.ok(gallery.cases.length >= 100, 'gallery should export the stress corpus');
  assert.ok(playground.presets.length >= 4, 'playground should export presets');

  assertRelativePath(manifest.assets.cover, 'cover asset');
  manifest.assets.screenshots.forEach((asset) => {
    assertRelativePath(asset.src, `screenshot ${asset.id}`);
    assertPng(asset.src);
  });
  assertJpeg(manifest.assets.cover);

  manifest.app.scripts.forEach((item) => assertHashedJsPath(item, `app script ${item}`));
  manifest.app.modules.forEach((item) => assertHashedJsPath(item, `app module ${item}`));
  Object.values(manifest.data).forEach((item) => assertRelativePath(item, `data path ${item}`));
  manifest.sections.forEach((section) => {
    if (section.data) {
      assertRelativePath(section.data, `section data ${section.type}`);
    }
    if (section.runtime) {
      assertRelativePath(section.runtime, `section runtime ${section.type}`);
      assert.strictEqual(section.runtime, manifest.runtime, `section runtime ${section.type} should reuse manifest runtime`);
    }
  });

  gallery.cases.forEach((testCase) => {
    assert.ok(testCase.id, 'case should have id');
    assert.ok(testCase.group, `${testCase.id} should have group`);
    assert.ok(['offset', 'stroke'].includes(testCase.operation), `${testCase.id} operation should be valid`);
    assert.strictEqual(testCase.source.format, 'svgPath', `${testCase.id} should use svgPath source`);
    assert.ok(testCase.source.d.startsWith('M'), `${testCase.id} source should contain path data`);
    assert.ok(testCase.options.algorithm, `${testCase.id} should include algorithm option`);
    assert.ok(['pass', 'warn', 'fail'].includes(testCase.expected.status), `${testCase.id} expected status should be valid`);
  });

  const caseIds = new Set(gallery.cases.map((testCase) => testCase.id));
  playground.presets.forEach((preset) => {
    assert.ok(caseIds.has(preset.caseId), `${preset.id} should reference an exported gallery case`);
    assert.strictEqual(preset.source.format, 'svgPath', `${preset.id} should include source fixture`);
  });

  const runtimeSource = fs.readFileSync(path.join(output, manifest.runtime), 'utf8');
  const runtime = await import(`data:text/javascript;base64,${Buffer.from(runtimeSource).toString('base64')}`);
  assert.strictEqual(typeof runtime.mountGuide, 'function');
  assert.strictEqual(typeof runtime.mountGallery, 'function');
  assert.strictEqual(typeof runtime.mountPlayground, 'function');

  console.log(JSON.stringify({
    manifest: manifest.schema,
    guideCards: guide.cards.length,
    galleryCases: gallery.cases.length,
    playgroundPresets: playground.presets.length
  }, null, 2));
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
