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
  }

  function renderStressGallery() {
    var container = document.querySelector('.stress-grid');
    var summary = document.querySelector('.stress-summary');
    var cases = createStressCases(paper);
    var counts = {
      ok: 0,
      warn: 0,
      fail: 0
    };

    cases.forEach(function(testCase) {
      renderCase(testCase, container);
      counts[container.lastChild.dataset.status] += 1;
    });

    summary.textContent = cases.length + ' cases / ' + counts.ok + ' ok / ' + counts.warn + ' warnings / ' + counts.fail + ' failed';
  }

  window.addEventListener('DOMContentLoaded', renderStressGallery);
})();
