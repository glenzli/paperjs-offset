(function() {
  var sourceStyle = {
    fillColor: 'rgba(20, 184, 166, 0.16)',
    strokeColor: '#172a3a',
    strokeWidth: 2
  };

  var offsetStyle = {
    fillColor: 'rgba(225, 29, 72, 0.2)',
    strokeColor: '#be123c',
    strokeWidth: 2
  };

  var innerStyle = {
    fillColor: 'rgba(245, 158, 11, 0.22)',
    strokeColor: '#b45309',
    strokeWidth: 2
  };

  var comparisonStyle = {
    fillColor: 'rgba(37, 99, 235, 0.18)',
    strokeColor: '#2563eb',
    strokeWidth: 2
  };

  function setStyle(item, style) {
    Object.keys(style).forEach(function(key) {
      item[key] = style[key];
    });
  }

  function label(content, x, y, options) {
    options = options || {};
    return new paper.PointText({
      point: [x, y],
      content: content,
      justification: options.justification || 'center',
      fillColor: options.color || '#596168',
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: options.size || 12,
      fontWeight: options.weight || 650
    });
  }

  function drawAxis() {
    new paper.Path.Line({
      from: [-300, 0],
      to: [300, 0],
      strokeColor: 'rgba(23, 42, 58, 0.08)',
      strokeWidth: 1
    });
    new paper.Path.Line({
      from: [0, -170],
      to: [0, 170],
      strokeColor: 'rgba(23, 42, 58, 0.08)',
      strokeWidth: 1
    });
  }

  function makeUnion(circles) {
    var result = circles[0];
    for (var i = 1; i < circles.length; i += 1) {
      var next = result.unite(circles[i], { insert: true });
      result.remove();
      circles[i].remove();
      result = next;
    }
    return result;
  }

  function makeBlob(x, y, scale) {
    scale = scale || 1;
    return makeUnion([
      new paper.Path.Circle({ center: [x - 54 * scale, y - 16 * scale], radius: 58 * scale }),
      new paper.Path.Circle({ center: [x + 40 * scale, y - 20 * scale], radius: 50 * scale }),
      new paper.Path.Circle({ center: [x - 4 * scale, y + 48 * scale], radius: 46 * scale })
    ]);
  }

  function formatScore(score) {
    return Math.round(score * 100) / 100;
  }

  function formatQuality(source, result, distance, options) {
    var quality = paperjsOffset.analyze(source, result, distance, options || {});
    var warnings = quality.warnings.length > 0 ? quality.warnings.join(', ') : 'ok';
    return 'score ' + formatScore(quality.score) +
      ' / warnings ' + warnings +
      ' / intersections ' + quality.selfIntersections;
  }

  var demos = {
    'offset-direction': {
      code: [
        "const expanded = paperjsOffset.offset(source, 18, {",
        "  join: 'round'",
        "});",
        "",
        "const contracted = paperjsOffset.offset(source, -18, {",
        "  join: 'round'",
        "});"
      ].join('\n'),
      draw: function() {
        drawAxis();

        var source = new paper.Path.Star({
          center: [0, -8],
          points: 8,
          radius1: 82,
          radius2: 44
        });
        setStyle(source, sourceStyle);

        var expanded = paperjsOffset.offset(source, 18, { join: 'round' });
        setStyle(expanded, offsetStyle);

        var contracted = paperjsOffset.offset(source, -18, { join: 'round' });
        setStyle(contracted, innerStyle);

        source.bringToFront();
        label('source', 0, 112);
        label('+18 outward', -88, 136, { color: '#be123c' });
        label('-18 inward', 88, 136, { color: '#b45309' });

        return [
          '+18 ' + formatQuality(source, expanded, 18),
          '-18 ' + formatQuality(source, contracted, -18)
        ].join(' / ');
      }
    },

    'join-styles': {
      code: [
        "paperjsOffset.offset(path, 22, { join: 'miter', limit: 3 });",
        "paperjsOffset.offset(path, 22, { join: 'bevel' });",
        "paperjsOffset.offset(path, 22, { join: 'round' });"
      ].join('\n'),
      draw: function() {
        var joins = ['miter', 'bevel', 'round'];
        var positions = [-190, 0, 190];
        var summaries = [];

        joins.forEach(function(join, index) {
          var x = positions[index];
          var source = new paper.Path({
            segments: [
              [x - 48, 34],
              [x, -86],
              [x + 48, 34],
              [x + 12, 10],
              [x - 12, 10]
            ],
            closed: true
          });
          setStyle(source, sourceStyle);

          var expanded = paperjsOffset.offset(source, 22, { join: join, limit: 3 });
          setStyle(expanded, offsetStyle);
          source.bringToFront();
          label(join, x, 112);
          summaries.push(join + ' ' + formatQuality(source, expanded, 22));
        });

        return summaries.join(' / ');
      }
    },

    'stroke-outline': {
      code: [
        "const outline = paperjsOffset.offsetStroke(openPath, 18, {",
        "  join: 'round',",
        "  cap: 'round'",
        "});"
      ].join('\n'),
      draw: function() {
        var buttPath = new paper.Path({
          segments: [[-238, -48], [-176, -90], [-96, -34], [-26, -78]],
          strokeColor: '#0f766e',
          strokeWidth: 5
        });
        buttPath.smooth({ type: 'continuous' });

        var butt = paperjsOffset.offsetStroke(buttPath, 18, { join: 'round', cap: 'butt' });
        setStyle(butt, offsetStyle);
        buttPath.bringToFront();
        label('butt cap', -134, 12);

        var roundPath = new paper.Path({
          segments: [[34, -48], [96, -90], [176, -34], [246, -78]],
          strokeColor: '#2563eb',
          strokeWidth: 5
        });
        roundPath.smooth({ type: 'continuous' });

        var round = paperjsOffset.offsetStroke(roundPath, 18, { join: 'round', cap: 'round' });
        setStyle(round, comparisonStyle);
        roundPath.bringToFront();
        label('round cap', 140, 12);

        var closed = new paper.Path.Rectangle({
          point: [-78, 62],
          size: [156, 52],
          radius: 10,
          strokeColor: '#b45309',
          strokeWidth: 4
        });
        var closedStroke = paperjsOffset.offsetStroke(closed, 12, { join: 'round' });
        setStyle(closedStroke, innerStyle);
        closed.bringToFront();
        label('closed stroke', 0, 138);

        return [
          'open round ' + formatQuality(roundPath, round, 18, { stroke: true }),
          'closed ' + formatQuality(closed, closedStroke, 12, { stroke: true })
        ].join(' / ');
      }
    },

    'compound-paths': {
      code: [
        "const source = circleA.unite(circleB).unite(circleC);",
        "",
        "const expanded = paperjsOffset.offset(source, 16, { join: 'round' });",
        "const inner = paperjsOffset.offset(source, -14, { join: 'round' });",
        "paperjsOffset.offset(inner, -10, { join: 'round' });"
      ].join('\n'),
      draw: function() {
        var source = makeBlob(0, -12, 1);
        setStyle(source, sourceStyle);

        var expanded = paperjsOffset.offset(source, 16, { join: 'round' });
        setStyle(expanded, offsetStyle);

        var inner = paperjsOffset.offset(source, -14, { join: 'round' });
        setStyle(inner, innerStyle);

        var deeper = paperjsOffset.offset(inner, -10, { join: 'round' });
        setStyle(deeper, comparisonStyle);

        source.bringToFront();
        label('compound source', 0, 126);
        label('repeated negative offset', 0, 146);

        return [
          'outer ' + formatQuality(source, expanded, 16),
          'inner ' + formatQuality(source, inner, -14)
        ].join(' / ');
      }
    },

    'auto-strategy': {
      code: [
        "const legacy = paperjsOffset.offset(source, 24, {",
        "  algorithm: 'legacy'",
        "});",
        "",
        "const result = paperjsOffset.offset(source, 24, {",
        "  algorithm: 'auto'",
        "});",
        "",
        "paperjsOffset.analyze(source, result, 24);"
      ].join('\n'),
      draw: function() {
        var legacySource = makeBlob(-150, -16, 0.72);
        var autoSource = makeBlob(150, -16, 0.72);
        setStyle(legacySource, sourceStyle);
        setStyle(autoSource, sourceStyle);

        var legacy = paperjsOffset.offset(legacySource, 24, {
          join: 'miter',
          algorithm: 'legacy'
        });
        var auto = paperjsOffset.offset(autoSource, 24, {
          join: 'miter',
          algorithm: 'auto'
        });
        setStyle(legacy, offsetStyle);
        setStyle(auto, comparisonStyle);

        legacySource.bringToFront();
        autoSource.bringToFront();
        label('legacy', -150, 126);
        label(formatQuality(legacySource, legacy, 24), -150, 146, { size: 10 });
        label('auto', 150, 126);
        label(formatQuality(autoSource, auto, 24), 150, 146, { size: 10 });

        return [
          'legacy ' + formatQuality(legacySource, legacy, 24),
          'auto ' + formatQuality(autoSource, auto, 24)
        ].join(' / ');
      }
    },

    'quality-score': {
      code: [
        "const result = paperjsOffset.offset(path, -12, {",
        "  join: 'round',",
        "  limit: 4,",
        "  algorithm: 'auto'",
        "});",
        "",
        "const quality = paperjsOffset.analyze(path, result, -12);"
      ].join('\n'),
      draw: function() {
        var path = new paper.Path({
          pathData: 'M466,467c-65,-34 136,64 0,0c-391,-270 520,-471 522,-137c-214,-144 -1489,123 -923,-163z'
        });
        path.scale(0.25);
        path.position = [0, -8];
        setStyle(path, sourceStyle);

        var result = paperjsOffset.offset(path, -12, {
          join: 'round',
          limit: 4,
          algorithm: 'auto'
        });
        setStyle(result, offsetStyle);
        path.bringToFront();
        label('hard curve input', 0, 126);
        label('inspect score before trusting output', 0, 146);

        return formatQuality(path, result, -12);
      }
    }
  };

  function renderDemo(card) {
    var canvas = card.querySelector('canvas[data-demo]');
    var demo = demos[canvas.dataset.demo];
    var code = card.querySelector('pre code');
    var quality = card.querySelector('.demo-quality');

    if (!demo) {
      return;
    }

    code.textContent = demo.code;
    paper.setup(canvas);
    paper.project.activeLayer.removeChildren();
    paper.view.center = [0, 0];

    try {
      quality.textContent = demo.draw();
    } catch (error) {
      console.error(error);
      quality.textContent = 'Demo failed. Check the console for details.';
      label('Demo failed', 0, 0);
    }

    paper.view.update();
  }

  function runDemos() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-demo-card]'), renderDemo);
  }

  window.addEventListener('DOMContentLoaded', runDemos);
})();
