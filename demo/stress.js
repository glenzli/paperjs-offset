(function() {
  var resultStyle = {
    fillColor: 'rgba(225, 29, 72, 0.2)',
    strokeColor: '#be123c',
    strokeWidth: 2
  };

  var sourceFillStyle = {
    fillColor: 'rgba(20, 184, 166, 0.18)',
    strokeColor: '#172a3a',
    strokeWidth: 1.8
  };

  var sourceStrokeStyle = {
    fillColor: null,
    strokeColor: '#0f766e',
    strokeWidth: 3
  };

  function setStyle(item, style) {
    Object.keys(style).forEach(function(key) {
      item[key] = style[key];
    });
  }

  function formatScore(score) {
    return Math.round(score * 100) / 100;
  }

  var groupOrder = [
    'closed-offset',
    'smooth-offset',
    'compound-offset',
    'stroke-offset',
    'boundary-offset',
    'boundary-compound',
    'boundary-stroke',
    'edge-case'
  ];

  var groupCopy = {
    'closed-offset': {
      title: 'Closed polygon offsets',
      description: 'Sharp stars and polygonal inward/outward offsets.'
    },
    'smooth-offset': {
      title: 'Smooth curve offsets',
      description: 'Bezier-heavy blobs that stress curve sampling and joins.'
    },
    'compound-offset': {
      title: 'Compound shapes',
      description: 'Boolean unions and holes that need path normalization.'
    },
    'stroke-offset': {
      title: 'Stroke outlines',
      description: 'Open paths converted to filled outlines with joins and caps.'
    },
    'boundary-offset': {
      title: 'Boundary closed offsets',
      description: 'More aggressive spikes, narrow bays, and inward collapse probes.'
    },
    'boundary-compound': {
      title: 'Boundary compound shapes',
      description: 'Small holes and tight compound geometry near boolean limits.'
    },
    'boundary-stroke': {
      title: 'Boundary stroke outlines',
      description: 'Hairpin turns and near-overlapping stroke outlines.'
    },
    'edge-case': {
      title: 'Named edge cases',
      description: 'Small repro-style cases kept for targeted regression checks.'
    }
  };

  function getGroupCopy(kind) {
    return groupCopy[kind] || {
      title: kind || 'Other cases',
      description: 'Additional deterministic offset cases.'
    };
  }

  function renderCase(testCase, container) {
    var card = document.createElement('article');
    var canvas = document.createElement('canvas');
    var copy = document.createElement('div');
    var title = document.createElement('h2');
    var meta = document.createElement('p');
    var qualityLine = document.createElement('p');

    card.className = 'stress-card';
    canvas.width = 320;
    canvas.height = 220;
    title.textContent = testCase.title;
    meta.className = 'stress-meta';
    meta.textContent = testCase.id + ' / ' + testCase.operation + ' / ' + testCase.distance;
    qualityLine.className = 'stress-quality';

    copy.appendChild(title);
    copy.appendChild(meta);
    copy.appendChild(qualityLine);
    card.appendChild(canvas);
    card.appendChild(copy);
    container.appendChild(card);

    paper.setup(canvas);
    paper.view.viewSize = new paper.Size(320, 220);
    paper.project.activeLayer.removeChildren();
    paper.view.center = [160, 110];

    try {
      var source = testCase.draw();
      var options = Object.assign({}, testCase.options, {
        algorithm: 'auto',
        insert: false
      });
      var result = testCase.operation === 'stroke'
        ? paperjsOffset.offsetStroke(source, testCase.distance, options)
        : paperjsOffset.offset(source, testCase.distance, options);
      var quality = paperjsOffset.analyze(source, result, testCase.distance, {
        stroke: testCase.operation === 'stroke'
      });

      setStyle(result, resultStyle);
      setStyle(source, testCase.operation === 'stroke' ? sourceStrokeStyle : sourceFillStyle);
      source.bringToFront();

      var group = new paper.Group([result, source]);
      paper.project.activeLayer.addChild(group);
      group.fitBounds(new paper.Rectangle(20, 18, 280, 150));
      qualityLine.textContent = quality.warnings.length > 0
        ? 'score ' + formatScore(quality.score) + ' / ' + quality.warnings.join(', ')
        : 'score ' + formatScore(quality.score) + ' / ok';
      card.dataset.status = quality.warnings.length > 0 ? 'warn' : 'ok';
    } catch (error) {
      qualityLine.textContent = 'failed / ' + (error && error.message ? error.message : error);
      card.dataset.status = 'fail';
    }

    paper.view.update();
    return card.dataset.status;
  }

  function createGroupSection(kind, testCases) {
    var group = document.createElement('section');
    var header = document.createElement('header');
    var title = document.createElement('h2');
    var description = document.createElement('p');
    var grid = document.createElement('div');
    var copy = getGroupCopy(kind);

    group.className = 'stress-group';
    header.className = 'stress-group-header';
    title.textContent = copy.title;
    description.textContent = testCases.length + ' cases / ' + copy.description;
    grid.className = 'stress-grid';

    header.appendChild(title);
    header.appendChild(description);
    group.appendChild(header);
    group.appendChild(grid);

    return {
      group: group,
      grid: grid
    };
  }

  function renderStressCorpus() {
    var container = document.querySelector('.stress-groups');
    var summary = document.querySelector('.stress-summary');
    var cases = createStressCases(paper);
    var grouped = {};
    var counts = {
      ok: 0,
      warn: 0,
      fail: 0
    };

    cases.forEach(function(testCase) {
      var kind = testCase.kind || 'other';
      if (!grouped[kind]) {
        grouped[kind] = [];
      }
      grouped[kind].push(testCase);
    });

    groupOrder.concat(Object.keys(grouped)).filter(function(kind, index, allKinds) {
      return grouped[kind] && allKinds.indexOf(kind) === index;
    }).forEach(function(kind) {
      var section = createGroupSection(kind, grouped[kind]);
      container.appendChild(section.group);
      grouped[kind].forEach(function(testCase) {
        var status = renderCase(testCase, section.grid);
        counts[status] += 1;
      });
    });

    summary.textContent = cases.length + ' cases / ' + counts.ok + ' ok / ' + counts.warn + ' warnings / ' + counts.fail + ' failed';
  }

  window.addEventListener('DOMContentLoaded', renderStressCorpus);
})();
