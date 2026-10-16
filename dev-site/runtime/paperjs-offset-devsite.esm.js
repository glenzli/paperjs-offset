const DEFAULT_LANG = 'en';
const canvasProjects = new WeakMap();

function releaseProjects(container) {
  container.querySelectorAll('canvas').forEach((canvas) => {
    const record = canvasProjects.get(canvas);
    if (record) {
      record.project.remove();
      canvasProjects.delete(canvas);
    }
  });
}

function mountHandle(root) {
  return {
    destroy() {
      releaseProjects(root);
      root.remove();
    }
  };
}

function getGlobalValue(name) {
  if (typeof globalThis === 'undefined') {
    return undefined;
  }
  return globalThis[name];
}

function text(value, lang) {
  if (typeof value === 'string') {
    return value;
  }
  if (!value || typeof value !== 'object') {
    return '';
  }
  return value[lang] || value.en || value.zh || '';
}

function basePath(options) {
  const base = options && options.basePath ? String(options.basePath) : '';
  return base.endsWith('/') || base === '' ? base : `${base}/`;
}

function resolveAsset(options, asset) {
  if (!asset || /^([a-z]+:)?\/\//i.test(asset) || asset[0] === '/') {
    return asset;
  }
  return `${basePath(options)}${asset}`;
}

function resolvePaper(options) {
  return options && options.paper ? options.paper : getGlobalValue('paper');
}

function resolveOffsetApi(options) {
  const candidate = options && (options.paperjsOffset || options.offsetApi)
    ? (options.paperjsOffset || options.offsetApi)
    : (getGlobalValue('paperjsOffset') || getGlobalValue('PaperOffset'));
  const api = candidate && candidate.PaperOffset ? candidate.PaperOffset : candidate;
  if (!api) {
    return null;
  }
  return {
    offset: api.offset,
    offsetStroke: api.offsetStroke,
    analyze: api.analyze
  };
}

function hasRuntime(options) {
  const paper = resolvePaper(options);
  const api = resolveOffsetApi(options);
  return !!(paper && api && api.offset && api.offsetStroke && api.analyze);
}

function reset(container, className) {
  releaseProjects(container);
  const root = document.createElement('section');
  root.className = `po-root ${className || ''}`.trim();
  root.appendChild(styleElement());
  container.replaceChildren(root);
  return root;
}

function styleElement() {
  const style = document.createElement('style');
  style.textContent = `
.po-root{--po-ink:#172a3a;--po-muted:#64748b;--po-line:#d8e1e8;--po-soft:#f8fafc;--po-accent:#0f766e;--po-danger:#be123c;--po-blue:#2563eb;color:var(--po-ink);font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
.po-root *{box-sizing:border-box}
.po-root button,.po-root input,.po-root select{font:inherit}
.po-stack{display:grid;gap:18px}
.po-guide-grid{display:grid;gap:18px}
.po-card{display:grid;gap:14px;border:1px solid var(--po-line);border-radius:8px;background:#fff;padding:16px}
.po-guide-card{grid-template-columns:minmax(260px,0.9fr) minmax(260px,1.1fr);align-items:stretch}
.po-card canvas{display:block;width:100%;height:auto;min-height:180px;border:1px solid var(--po-line);border-radius:6px;background:linear-gradient(#edf2f7 1px,transparent 1px),linear-gradient(90deg,#edf2f7 1px,transparent 1px),#fbfdff;background-size:32px 32px}
.po-card h3{margin:0;color:#101820;font-size:20px;line-height:1.2}
.po-card p{margin:0;color:var(--po-muted);line-height:1.55}
.po-step{font-size:12px;font-weight:750;letter-spacing:.08em;text-transform:uppercase;color:var(--po-accent)}
.po-code{overflow:auto;margin:0;border-radius:6px;background:#101820;color:#dce7ef;padding:14px;font-size:13px;line-height:1.45}
.po-quality{font-size:13px;color:#334155}
.po-tabs{display:flex;flex-wrap:wrap;gap:10px}
.po-tab{border:1px solid var(--po-line);border-radius:6px;background:#fff;color:#334155;padding:8px 12px;font-weight:700;cursor:pointer}
.po-tab[aria-selected=true]{border-color:var(--po-accent);color:var(--po-accent)}
.po-group{display:grid;gap:12px}
.po-group header{display:grid;gap:4px}
.po-group h3{margin:0;font-size:22px}
.po-gallery-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:14px}
.po-gallery-card{min-width:0;padding:12px}
.po-gallery-card>*{min-width:0;max-width:100%}
.po-gallery-card canvas{min-height:160px}
.po-meta{display:grid;gap:2px;font-size:12px;color:var(--po-muted)}
.po-meta code,.po-meta span{min-width:0;overflow-wrap:anywhere}
.po-meta code{font:inherit;color:#475569}
.po-status-ok{color:#0f766e}.po-status-warn{color:#b45309}.po-status-fail{color:#be123c}
.po-playground{display:grid;grid-template-columns:minmax(280px,.7fr) minmax(320px,1fr);gap:18px;align-items:start}
.po-panel{display:grid;gap:14px;border:1px solid var(--po-line);border-radius:8px;background:#fff;padding:16px}
.po-field{display:grid;gap:6px}
.po-field label{display:flex;align-items:center;justify-content:space-between;gap:12px;font-weight:750;color:#334155}
.po-field output{font-variant-numeric:tabular-nums;color:var(--po-accent)}
.po-field input,.po-field select{width:100%;border:1px solid var(--po-line);border-radius:6px;background:#fff;color:#172a3a;padding:8px 10px}
.po-fallback{display:grid;gap:12px;border:1px solid var(--po-line);border-radius:8px;background:#fff;padding:16px}
.po-fallback img{display:block;width:100%;height:auto;border-radius:6px;border:1px solid var(--po-line)}
@media (max-width:760px){.po-guide-card,.po-playground{grid-template-columns:1fr}.po-card h3{font-size:18px}}
`;
  return style;
}

function fallback(root, data, options, image) {
  const lang = options.lang || DEFAULT_LANG;
  const box = document.createElement('div');
  box.className = 'po-fallback';
  const title = document.createElement('h3');
  title.textContent = text(data.title, lang) || 'paperjs-offset';
  const summary = document.createElement('p');
  summary.textContent = text(data.summary, lang) || 'Static preview is available. Interactive runtime dependencies were not provided.';
  const img = document.createElement('img');
  img.alt = title.textContent;
  img.src = resolveAsset(options, image);
  box.append(title, summary, img);
  root.appendChild(box);
}

function withPaper(canvas, options, width, height, center) {
  const paper = resolvePaper(options);
  let record = canvasProjects.get(canvas);
  if (record && record.paper !== paper) {
    record.project.remove();
    record = null;
  }
  if (!record) {
    paper.setup(canvas);
    record = { paper, project: paper.project };
    canvasProjects.set(canvas, record);
  }
  record.project.activate();
  paper.project.activeLayer.removeChildren();
  paper.view.viewSize = new paper.Size(width, height);
  paper.view.center = center || [0, 0];
  return paper;
}

function setStyle(item, style) {
  Object.keys(style).forEach((key) => {
    item[key] = style[key];
  });
}

const sourceStyle = {
  fillColor: 'rgba(20, 184, 166, 0.16)',
  strokeColor: '#172a3a',
  strokeWidth: 2
};
const sourceStrokeStyle = {
  fillColor: null,
  strokeColor: '#0f766e',
  strokeWidth: 3
};
const resultStyle = {
  fillColor: 'rgba(225, 29, 72, 0.2)',
  strokeColor: '#be123c',
  strokeWidth: 2
};
const innerStyle = {
  fillColor: 'rgba(245, 158, 11, 0.22)',
  strokeColor: '#b45309',
  strokeWidth: 2
};
const comparisonStyle = {
  fillColor: 'rgba(37, 99, 235, 0.18)',
  strokeColor: '#2563eb',
  strokeWidth: 2
};

function label(paper, content, x, y, options) {
  return new paper.PointText({
    point: [x, y],
    content,
    justification: options && options.justification ? options.justification : 'center',
    fillColor: options && options.color ? options.color : '#596168',
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: options && options.size ? options.size : 12,
    fontWeight: options && options.weight ? options.weight : 650
  });
}

function makeUnion(paths) {
  let result = paths[0];
  for (let index = 1; index < paths.length; index += 1) {
    const next = result.unite(paths[index], { insert: true });
    result.remove();
    paths[index].remove();
    result = next;
  }
  return result;
}

function makeBlob(paper, x, y, scale) {
  const s = scale || 1;
  return makeUnion([
    new paper.Path.Circle({ center: [x - 54 * s, y - 16 * s], radius: 58 * s }),
    new paper.Path.Circle({ center: [x + 40 * s, y - 20 * s], radius: 50 * s }),
    new paper.Path.Circle({ center: [x - 4 * s, y + 48 * s], radius: 46 * s })
  ]);
}

function formatScore(score) {
  return Math.round(score * 100) / 100;
}

function formatQuality(api, source, result, distance, options) {
  const quality = api.analyze(source, result, distance, options || {});
  const warnings = quality.warnings.length > 0 ? quality.warnings.join(', ') : 'ok';
  return `score ${formatScore(quality.score)} / ${warnings}`;
}

function fit(paper, items, rectangle) {
  const group = new paper.Group(items.filter(Boolean));
  paper.project.activeLayer.addChild(group);
  group.fitBounds(new paper.Rectangle(rectangle[0], rectangle[1], rectangle[2], rectangle[3]));
  return group;
}

function needsResultInset(source, result) {
  const sourceSpan = Math.max(source.bounds.width, source.bounds.height);
  const resultSpan = Math.max(result.bounds.width, result.bounds.height);
  return sourceSpan > 0 && resultSpan > 0 && resultSpan / sourceSpan < 0.22;
}

function renderResultInset(paper, result) {
  new paper.Path.Rectangle({
    rectangle: new paper.Rectangle(218, 28, 82, 122),
    fillColor: '#ffffff',
    strokeColor: '#d8e1e8',
    strokeWidth: 1
  });
  const clone = result.clone({ insert: false });
  fit(paper, [clone], [230, 40, 58, 98]);
  setStyle(clone, resultStyle);
}

function createPathFromSource(paper, source) {
  const args = { pathData: source.d, insert: false };
  return source.compound
    ? new paper.CompoundPath(args)
    : new paper.Path(args);
}

function drawGuide(canvas, demoId, options) {
  const api = resolveOffsetApi(options);
  const paper = withPaper(canvas, options, 640, 380, [0, 0]);

  if (demoId === 'offset-direction') {
    const source = new paper.Path.Star({ center: [0, -8], points: 8, radius1: 82, radius2: 44 });
    setStyle(source, sourceStyle);
    const expanded = api.offset(source, 18, { join: 'round' });
    const contracted = api.offset(source, -18, { join: 'round' });
    setStyle(expanded, resultStyle);
    setStyle(contracted, innerStyle);
    source.bringToFront();
    label(paper, 'source', 0, 112);
    label(paper, '+18 outward', -88, 136, { color: '#be123c' });
    label(paper, '-18 inward', 88, 136, { color: '#b45309' });
    paper.view.update();
    return `+18 ${formatQuality(api, source, expanded, 18)} / -18 ${formatQuality(api, source, contracted, -18)}`;
  }

  if (demoId === 'join-styles') {
    const joins = ['miter', 'bevel', 'round'];
    const positions = [-190, 0, 190];
    const summaries = [];
    joins.forEach((join, index) => {
      const x = positions[index];
      const source = new paper.Path({
        segments: [[x - 48, 34], [x, -86], [x + 48, 34], [x + 12, 10], [x - 12, 10]],
        closed: true
      });
      setStyle(source, sourceStyle);
      const expanded = api.offset(source, 22, { join, limit: 3 });
      setStyle(expanded, resultStyle);
      source.bringToFront();
      label(paper, join, x, 112);
      summaries.push(`${join} ${formatQuality(api, source, expanded, 22)}`);
    });
    paper.view.update();
    return summaries.join(' / ');
  }

  if (demoId === 'stroke-outline') {
    const openPath = new paper.Path({
      segments: [[-238, -48], [-176, -90], [-96, -34], [-26, -78]],
      strokeColor: '#0f766e',
      strokeWidth: 5
    });
    openPath.smooth({ type: 'continuous' });
    const butt = api.offsetStroke(openPath, 18, { join: 'round', cap: 'butt' });
    setStyle(butt, resultStyle);
    openPath.bringToFront();
    label(paper, 'butt cap', -134, 12);

    const roundPath = new paper.Path({
      segments: [[34, -48], [96, -90], [176, -34], [246, -78]],
      strokeColor: '#2563eb',
      strokeWidth: 5
    });
    roundPath.smooth({ type: 'continuous' });
    const round = api.offsetStroke(roundPath, 18, { join: 'round', cap: 'round' });
    setStyle(round, comparisonStyle);
    roundPath.bringToFront();
    label(paper, 'round cap', 140, 12);
    paper.view.update();
    return `round ${formatQuality(api, roundPath, round, 18, { stroke: true })}`;
  }

  if (demoId === 'compound-paths') {
    const source = makeBlob(paper, 0, -12, 1);
    setStyle(source, sourceStyle);
    const expanded = api.offset(source, 16, { join: 'round' });
    const inner = api.offset(source, -14, { join: 'round' });
    const deeper = api.offset(inner, -10, { join: 'round' });
    setStyle(expanded, resultStyle);
    setStyle(inner, innerStyle);
    setStyle(deeper, comparisonStyle);
    source.bringToFront();
    label(paper, 'compound source', 0, 126);
    label(paper, 'repeated negative offset', 0, 146);
    paper.view.update();
    return `outer ${formatQuality(api, source, expanded, 16)} / inner ${formatQuality(api, source, inner, -14)}`;
  }

  if (demoId === 'auto-strategy') {
    const legacySource = makeBlob(paper, -150, -16, 0.72);
    const autoSource = makeBlob(paper, 150, -16, 0.72);
    setStyle(legacySource, sourceStyle);
    setStyle(autoSource, sourceStyle);
    const legacy = api.offset(legacySource, 24, { join: 'miter', algorithm: 'legacy' });
    const auto = api.offset(autoSource, 24, { join: 'miter', algorithm: 'auto' });
    setStyle(legacy, resultStyle);
    setStyle(auto, comparisonStyle);
    legacySource.bringToFront();
    autoSource.bringToFront();
    label(paper, 'legacy', -150, 126);
    label(paper, 'auto', 150, 126);
    paper.view.update();
    return `legacy ${formatQuality(api, legacySource, legacy, 24)} / auto ${formatQuality(api, autoSource, auto, 24)}`;
  }

  const path = new paper.Path({
    pathData: 'M466,467c-65,-34 136,64 0,0c-391,-270 520,-471 522,-137c-214,-144 -1489,123 -923,-163z'
  });
  path.scale(0.25);
  path.position = [0, -8];
  setStyle(path, sourceStyle);
  const result = api.offset(path, -12, { join: 'round', limit: 4, algorithm: 'auto' });
  setStyle(result, resultStyle);
  path.bringToFront();
  label(paper, 'hard curve input', 0, 126);
  label(paper, 'inspect score before trusting output', 0, 146);
  paper.view.update();
  return formatQuality(api, path, result, -12);
}

function renderGalleryCase(card, testCase, options) {
  const api = resolveOffsetApi(options);
  const canvas = document.createElement('canvas');
  canvas.width = 320;
  canvas.height = 220;
  card.prepend(canvas);
  const paper = withPaper(canvas, options, 320, 220, [160, 110]);

  try {
    const source = createPathFromSource(paper, testCase.source);
    if (testCase.operation === 'stroke') {
      setStyle(source, sourceStrokeStyle);
    } else {
      setStyle(source, sourceStyle);
    }
    const callOptions = Object.assign({}, testCase.options, { insert: false });
    const result = testCase.operation === 'stroke'
      ? api.offsetStroke(source, testCase.distance, callOptions)
      : api.offset(source, testCase.distance, callOptions);
    setStyle(result, resultStyle);
    const quality = api.analyze(source, result, testCase.distance, {
      stroke: testCase.operation === 'stroke',
      join: testCase.options.join,
      cap: testCase.options.cap
    });
    const showResultInset = needsResultInset(source, result);
    source.bringToFront();
    fit(paper, [result, source], showResultInset ? [18, 18, 188, 150] : [20, 18, 280, 150]);
    if (showResultInset) {
      renderResultInset(paper, result);
    }
    paper.view.update();
    return {
      status: quality.warnings.length > 0 ? 'warn' : 'ok',
      label: quality.warnings.length > 0
        ? `score ${formatScore(quality.score)} / ${quality.warnings.join(', ')}`
        : `score ${formatScore(quality.score)} / ok`
    };
  } catch (error) {
    return {
      status: 'fail',
      label: `failed / ${error && error.message ? error.message : String(error)}`
    };
  }
}

function cardText(root, titleValue, descriptionValue, lang) {
  const h = document.createElement('h3');
  h.textContent = text(titleValue, lang);
  const p = document.createElement('p');
  p.textContent = text(descriptionValue, lang);
  root.append(h, p);
}

export function mountGuide(container, data, options = {}) {
  const lang = options.lang || DEFAULT_LANG;
  const root = reset(container, 'po-guide');
  if (!hasRuntime(options)) {
    fallback(root, data, Object.assign({ lang }, options), 'assets/guide.png');
    return mountHandle(root);
  }

  const grid = document.createElement('div');
  grid.className = 'po-guide-grid';
  (data.cards || []).forEach((card) => {
    const article = document.createElement('article');
    article.className = 'po-card po-guide-card';
    const visual = document.createElement('div');
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 380;
    visual.appendChild(canvas);
    const copy = document.createElement('div');
    copy.className = 'po-stack';
    const step = document.createElement('p');
    step.className = 'po-step';
    step.textContent = `${card.step} / ${card.id}`;
    const title = document.createElement('h3');
    title.textContent = text(card.title, lang);
    const description = document.createElement('p');
    description.textContent = text(card.description, lang);
    const quality = document.createElement('p');
    quality.className = 'po-quality';
    const code = document.createElement('pre');
    code.className = 'po-code';
    code.textContent = card.code || '';
    copy.append(step, title, description, quality, code);
    article.append(visual, copy);
    grid.appendChild(article);
    quality.textContent = drawGuide(canvas, card.demoId || card.id, options);
  });
  root.appendChild(grid);
  return mountHandle(root);
}

export function mountGallery(container, data, options = {}) {
  const lang = options.lang || DEFAULT_LANG;
  const root = reset(container, 'po-gallery');
  if (!hasRuntime(options)) {
    fallback(root, data, Object.assign({ lang }, options), 'assets/gallery.png');
    return mountHandle(root);
  }

  const stack = document.createElement('div');
  stack.className = 'po-stack';
  const tabs = document.createElement('div');
  tabs.className = 'po-tabs';
  const content = document.createElement('div');
  content.className = 'po-stack';
  stack.append(tabs, content);
  root.appendChild(stack);

  let selectedTab = options.tab || data.defaultTab || (data.tabs && data.tabs[0] && data.tabs[0].id);
  const groupsById = new Map((data.groups || []).map((group) => [group.id, group]));
  const cases = data.cases || [];

  function render() {
    tabs.replaceChildren();
    releaseProjects(content);
    content.replaceChildren();
    (data.tabs || []).forEach((tab) => {
      const button = document.createElement('button');
      button.className = 'po-tab';
      button.type = 'button';
      button.textContent = text(tab.title, lang) || tab.id;
      button.setAttribute('aria-selected', String(tab.id === selectedTab));
      button.addEventListener('click', () => {
        selectedTab = tab.id;
        render();
      });
      tabs.appendChild(button);
    });

    const tab = (data.tabs || []).find((item) => item.id === selectedTab) || data.tabs[0];
    const selectedGroups = new Set(tab ? tab.groups : []);
    Array.from(selectedGroups).forEach((groupId) => {
      const group = groupsById.get(groupId) || { id: groupId, title: groupId, description: '' };
      const groupCases = cases.filter((testCase) => testCase.group === groupId);
      const section = document.createElement('section');
      section.className = 'po-group';
      const header = document.createElement('header');
      cardText(header, group.title, group.description, lang);
      const grid = document.createElement('div');
      grid.className = 'po-gallery-grid';
      groupCases.forEach((testCase) => {
        const card = document.createElement('article');
        card.className = 'po-card po-gallery-card';
        const title = document.createElement('h3');
        title.textContent = text(testCase.title, lang) || testCase.id;
        const meta = document.createElement('p');
        meta.className = 'po-meta';
        const caseId = document.createElement('code');
        caseId.textContent = testCase.id;
        const detail = document.createElement('span');
        const details = [testCase.operation, String(testCase.distance)];
        if (testCase.options && testCase.options.join) {
          details.push(`join=${testCase.options.join}`);
        }
        if (testCase.options && testCase.options.cap) {
          details.push(`cap=${testCase.options.cap}`);
        }
        detail.textContent = details.join(' / ');
        meta.append(caseId, detail);
        const quality = document.createElement('p');
        quality.className = 'po-quality';
        card.append(title, meta, quality);
        const rendered = renderGalleryCase(card, testCase, options);
        quality.textContent = rendered.label;
        quality.classList.add(`po-status-${rendered.status}`);
        grid.appendChild(card);
      });
      section.append(header, grid);
      content.appendChild(section);
    });
  }

  render();
  return mountHandle(root);
}

function readControlValue(control, element) {
  if (control.type === 'number' || control.type === 'range') {
    return Number(element.value);
  }
  return element.value;
}

function renderPlaygroundCanvas(canvas, preset, state, options) {
  const api = resolveOffsetApi(options);
  const paper = withPaper(canvas, options, 720, 420, [360, 210]);
  const source = createPathFromSource(paper, preset.source);
  setStyle(source, preset.operation === 'stroke' ? sourceStrokeStyle : sourceStyle);
  const offsetOptions = {
    join: state.join,
    cap: state.cap,
    limit: state.limit,
    algorithm: state.algorithm,
    insert: false
  };
  const result = preset.operation === 'stroke'
    ? api.offsetStroke(source, state.distance, offsetOptions)
    : api.offset(source, state.distance, offsetOptions);
  setStyle(result, resultStyle);
  source.bringToFront();
  fit(paper, [result, source], [34, 28, 652, 310]);
  const quality = api.analyze(source, result, state.distance, {
    stroke: preset.operation === 'stroke',
    join: state.join,
    cap: state.cap
  });
  paper.view.update();
  return quality.warnings.length > 0
    ? `score ${formatScore(quality.score)} / ${quality.warnings.join(', ')}`
    : `score ${formatScore(quality.score)} / ok`;
}

export function mountPlayground(container, data, options = {}) {
  const lang = options.lang || DEFAULT_LANG;
  const root = reset(container, 'po-playground-root');
  if (!hasRuntime(options)) {
    fallback(root, data, Object.assign({ lang }, options), 'assets/playground.png');
    return mountHandle(root);
  }

  const presets = data.presets || [];
  let preset = presets.find((item) => item.id === data.defaultPreset) || presets[0];
  let state = Object.assign({
    distance: preset ? preset.distance : 12,
    join: preset && preset.options ? preset.options.join : 'round',
    cap: preset && preset.options ? preset.options.cap || 'round' : 'round',
    algorithm: preset && preset.options ? preset.options.algorithm || 'auto' : 'auto',
    limit: preset && preset.options ? preset.options.limit || 4 : 4
  });

  const shell = document.createElement('div');
  shell.className = 'po-playground';
  const controls = document.createElement('div');
  controls.className = 'po-panel';
  const preview = document.createElement('div');
  preview.className = 'po-panel';
  const canvas = document.createElement('canvas');
  canvas.width = 720;
  canvas.height = 420;
  const quality = document.createElement('p');
  quality.className = 'po-quality';
  preview.append(canvas, quality);
  shell.append(controls, preview);
  root.appendChild(shell);

  function rerender() {
    quality.textContent = renderPlaygroundCanvas(canvas, preset, state, options);
  }

  function addField(labelValue, element, valueOutput) {
    const field = document.createElement('div');
    field.className = 'po-field';
    const labelEl = document.createElement('label');
    labelEl.textContent = text(labelValue, lang);
    if (valueOutput) {
      labelEl.appendChild(valueOutput);
    }
    field.append(labelEl, element);
    controls.appendChild(field);
  }

  const presetSelect = document.createElement('select');
  presets.forEach((item) => {
    const option = document.createElement('option');
    option.value = item.id;
    option.textContent = text(item.title, lang) || item.id;
    option.selected = item.id === preset.id;
    presetSelect.appendChild(option);
  });
  presetSelect.addEventListener('change', () => {
    preset = presets.find((item) => item.id === presetSelect.value) || presets[0];
    state.distance = preset.distance;
    state.join = preset.options.join || 'round';
    state.cap = preset.options.cap || 'round';
    state.algorithm = preset.options.algorithm || 'auto';
    state.limit = preset.options.limit || 4;
    controls.replaceChildren();
    mountControls();
    rerender();
  });

  function mountControls() {
    addField({ en: 'Preset', zh: '预设' }, presetSelect);
    (data.controls || []).forEach((control) => {
      const input = control.type === 'select' ? document.createElement('select') : document.createElement('input');
      const valueOutput = control.type === 'range' ? document.createElement('output') : null;
      input.name = control.id;
      if (valueOutput) {
        valueOutput.value = String(state[control.id]);
        valueOutput.textContent = String(state[control.id]);
      }
      if (control.type === 'select') {
        (control.options || []).forEach((value) => {
          const option = document.createElement('option');
          option.value = value;
          option.textContent = value;
          option.selected = state[control.id] === value;
          input.appendChild(option);
        });
      } else {
        input.type = control.type === 'range' ? 'range' : 'number';
        input.min = control.min;
        input.max = control.max;
        input.step = control.step || 1;
        input.value = state[control.id];
      }
      input.addEventListener('input', () => {
        state[control.id] = readControlValue(control, input);
        if (valueOutput) {
          valueOutput.value = String(state[control.id]);
          valueOutput.textContent = String(state[control.id]);
        }
        rerender();
      });
      input.addEventListener('change', () => {
        state[control.id] = readControlValue(control, input);
        if (valueOutput) {
          valueOutput.value = String(state[control.id]);
          valueOutput.textContent = String(state[control.id]);
        }
        rerender();
      });
      addField(control.label, input, valueOutput);
    });
  }

  mountControls();
  rerender();
  return mountHandle(root);
}

export default {
  mountGuide,
  mountGallery,
  mountPlayground
};
