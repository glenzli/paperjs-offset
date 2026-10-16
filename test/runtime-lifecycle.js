const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test, before, beforeEach, afterEach } = require('node:test');
const paper = require('paper');
const api = require('../dist/index.cjs');

// Only DOM ownership and events are simulated; all Paper.js projects and geometry are real.
class Element {
  constructor(tagName) {
    this.tagName = tagName;
    this.children = [];
    this.parentNode = null;
    this.events = {};
    this.classList = { add() {} };
  }
  append(...nodes) { nodes.forEach((node) => this.appendChild(node)); }
  appendChild(node) {
    node.remove();
    node.parentNode = this;
    this.children.push(node);
    return node;
  }
  prepend(node) { this.appendChild(node); this.children.unshift(this.children.pop()); }
  remove() {
    if (this.parentNode) {
      const siblings = this.parentNode.children;
      siblings.splice(siblings.indexOf(this), 1);
      this.parentNode = null;
    }
  }
  replaceChildren(...nodes) {
    this.children.slice().forEach((node) => node.remove());
    this.append(...nodes);
  }
  querySelectorAll(tag) {
    return this.children.flatMap((child) => [
      ...(child.tagName === tag ? [child] : []), ...child.querySelectorAll(tag),
    ]);
  }
  setAttribute(name, value) { this[name] = value; }
  addEventListener(event, listener) { (this.events[event] ||= []).push(listener); }
  dispatch(event) { (this.events[event] || []).forEach((listener) => listener()); }
}

let runtime;
const options = { paper, paperjsOffset: api };
const playground = {
  defaultPreset: 'square',
  presets: [{
    id: 'square', source: { d: 'M0 0h100v100h-100z' }, distance: 10,
    operation: 'offset', options: { join: 'round' },
  }],
  controls: [{ id: 'distance', type: 'range', min: -20, max: 20, label: 'Distance' }],
};

before(async () => {
  const source = fs.readFileSync(path.join(__dirname, '../dev-site/runtime/paperjs-offset-devsite.esm.js'), 'utf8');
  runtime = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
});
beforeEach(() => {
  global.document = { createElement: (tag) => new Element(tag) };
  paper.setup(new paper.Size(100, 100));
});
afterEach(() => {
  paper.clear();
  delete global.document;
});

test('playground redraws reuse one project and destroy preserves external projects', () => {
  const external = paper.project;
  const container = new Element('div');
  const handle = runtime.mountPlayground(container, playground, options);
  assert.equal(paper.projects.length, 2);
  const ownProject = paper.project;
  const input = container.querySelectorAll('input')[0];
  for (let index = 0; index < 20; index += 1) {
    input.value = String(index - 10);
    input.dispatch('input');
    input.dispatch('change');
    assert.equal(paper.projects.length, 2);
    assert.equal(paper.project, ownProject);
  }
  handle.destroy();
  handle.destroy();
  assert.deepEqual(paper.projects, [external]);
  assert.equal(container.children.length, 0);
});

test('gallery tab changes release projects belonging to the old canvases', () => {
  const container = new Element('div');
  const data = {
    defaultTab: 'a', tabs: [{ id: 'a', groups: ['a'] }, { id: 'b', groups: ['b'] }],
    groups: [{ id: 'a' }, { id: 'b' }],
    cases: ['a', 'b'].map((group) => ({
      id: group, group, operation: 'offset', distance: 5,
      options: { join: 'round' }, source: { d: 'M0 0h100v100h-100z' },
    })),
  };
  const handle = runtime.mountGallery(container, data, options);
  for (let index = 0; index < 10; index += 1) {
    container.querySelectorAll('button')[index % 2].dispatch('click');
    assert.equal(paper.projects.length, 2);
  }
  handle.destroy();
  assert.equal(paper.projects.length, 1);
});

test('remount releases old projects and an old handle cannot destroy its replacement', () => {
  const container = new Element('div');
  const oldHandle = runtime.mountPlayground(container, playground, options);
  const replacement = runtime.mountPlayground(container, playground, options);
  assert.equal(paper.projects.length, 2);
  oldHandle.destroy();
  assert.equal(paper.projects.length, 2);
  assert.equal(container.children.length, 1);
  replacement.destroy();
  assert.equal(paper.projects.length, 1);
});

test('guide and playground mounts clean up only their own projects', () => {
  const first = new Element('div');
  const second = new Element('div');
  const guide = runtime.mountGuide(first, { cards: [{ id: 'offset-direction', step: 1 }] }, options);
  const play = runtime.mountPlayground(second, playground, options);
  assert.equal(paper.projects.length, 3);
  const playProject = paper.project;
  guide.destroy();
  assert.equal(paper.projects.length, 2);
  second.querySelectorAll('input')[0].dispatch('change');
  assert.equal(paper.project, playProject);
  play.destroy();
  assert.equal(paper.projects.length, 1);
});
