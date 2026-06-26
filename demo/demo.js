(function() {
  var sourceStyle = {
    fillColor: 'rgba(20, 184, 166, 0.18)',
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

  function setStyle(item, style) {
    Object.keys(style).forEach(function(key) {
      item[key] = style[key];
    });
  }

  function label(content, x, y) {
    return new paper.PointText({
      point: [x, y],
      content: content,
      justification: 'center',
      fillColor: '#596168',
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: 13,
      fontWeight: 600
    });
  }

  function drawAxis() {
    new paper.Path.Line({
      from: [-260, 0],
      to: [260, 0],
      strokeColor: 'rgba(23, 42, 58, 0.08)',
      strokeWidth: 1
    });
    new paper.Path.Line({
      from: [0, -145],
      to: [0, 145],
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

  var demos = {
    'closed-offset': {
      code: [
        "const source = new paper.Path.Star({",
        "  center: [0, 0], points: 8, radius1: 76, radius2: 44",
        "});",
        "",
        "paperjsOffset.offset(source, 18, { join: 'round' });",
        "paperjsOffset.offset(source, -18, { join: 'round' });"
      ].join('\n'),
      draw: function() {
        drawAxis();

        var source = new paper.Path.Star({
          center: [0, 0],
          points: 8,
          radius1: 76,
          radius2: 44
        });
        setStyle(source, sourceStyle);

        var expanded = paperjsOffset.offset(source, 18, { join: 'round' });
        setStyle(expanded, offsetStyle);

        var contracted = paperjsOffset.offset(source, -18, { join: 'round' });
        setStyle(contracted, innerStyle);

        source.bringToFront();
        label('source', 0, 118);
        label('+18 / -18 round joins', 0, 138);
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
        var positions = [-170, 0, 170];

        joins.forEach(function(join, index) {
          var x = positions[index];
          var source = new paper.Path({
            segments: [
              [x - 44, 36],
              [x, -76],
              [x + 44, 36],
              [x + 10, 8],
              [x - 10, 8]
            ],
            closed: true
          });
          setStyle(source, sourceStyle);

          var expanded = paperjsOffset.offset(source, 22, { join: join, limit: 3 });
          setStyle(expanded, offsetStyle);
          source.bringToFront();
          label(join, x, 112);
        });
      }
    },

    'compound-shape': {
      code: [
        "const source = circleA.unite(circleB).unite(circleC);",
        "",
        "paperjsOffset.offset(source, 16, { join: 'round' });",
        "const inner = paperjsOffset.offset(source, -14, { join: 'round' });",
        "paperjsOffset.offset(inner, -10, { join: 'round' });"
      ].join('\n'),
      draw: function() {
        var circles = [
          new paper.Path.Circle({ center: [-54, -16], radius: 58 }),
          new paper.Path.Circle({ center: [40, -20], radius: 50 }),
          new paper.Path.Circle({ center: [-4, 48], radius: 46 })
        ];
        var source = makeUnion(circles);
        setStyle(source, sourceStyle);

        var expanded = paperjsOffset.offset(source, 16, { join: 'round' });
        setStyle(expanded, offsetStyle);

        var inner = paperjsOffset.offset(source, -14, { join: 'round' });
        setStyle(inner, innerStyle);

        var deeper = paperjsOffset.offset(inner, -10, { join: 'round' });
        setStyle(deeper, {
          fillColor: 'rgba(37, 99, 235, 0.14)',
          strokeColor: '#2563eb',
          strokeWidth: 2
        });

        source.bringToFront();
        label('union plus repeated negative offsets', 0, 132);
      }
    },

    'stroke-expansion': {
      code: [
        "paperjsOffset.offsetStroke(openPath, 18, {",
        "  join: 'round',",
        "  cap: 'butt'",
        "});",
        "",
        "paperjsOffset.offsetStroke(openPath, 18, {",
        "  join: 'round',",
        "  cap: 'round'",
        "});"
      ].join('\n'),
      draw: function() {
        var buttPath = new paper.Path({
          segments: [[-230, -42], [-170, -84], [-92, -34], [-24, -78]],
          strokeColor: '#0f766e',
          strokeWidth: 5
        });
        buttPath.smooth({ type: 'continuous' });

        var butt = paperjsOffset.offsetStroke(buttPath, 18, { join: 'round', cap: 'butt' });
        setStyle(butt, offsetStyle);
        buttPath.bringToFront();
        label('butt cap', -128, 18);

        var roundPath = buttPath.clone();
        roundPath.position = [126, -58];
        roundPath.strokeColor = '#2563eb';

        var round = paperjsOffset.offsetStroke(roundPath, 18, { join: 'round', cap: 'round' });
        setStyle(round, {
          fillColor: 'rgba(37, 99, 235, 0.2)',
          strokeColor: '#2563eb',
          strokeWidth: 2
        });
        roundPath.bringToFront();
        label('round cap', 126, 18);

        var closed = new paper.Path.Rectangle({
          point: [-70, 62],
          size: [140, 48],
          radius: 10,
          strokeColor: '#b45309',
          strokeWidth: 4
        });
        var closedStroke = paperjsOffset.offsetStroke(closed, 12, { join: 'round' });
        setStyle(closedStroke, innerStyle);
        closed.bringToFront();
        label('closed stroke expansion', 0, 135);
      }
    },

    'curve-stress': {
      code: [
        "const issuePath = new paper.Path({ pathData });",
        "",
        "paperjsOffset.offset(issuePath, -12, {",
        "  join: 'round',",
        "  limit: 4",
        "});"
      ].join('\n'),
      draw: function() {
        var pathData = 'M466,467c-65,-34 136,64 0,0c-391,-270 520,-471 522,-137c-214,-144 -1489,123 -923,-163z';
        var source = new paper.Path({
          pathData: pathData
        });
        source.scale(0.24);
        source.position = [0, -10];
        setStyle(source, {
          fillColor: 'rgba(15, 118, 110, 0.14)',
          strokeColor: '#172a3a',
          strokeWidth: 2
        });

        var offset = paperjsOffset.offset(source, -12, { join: 'round', limit: 4 });
        setStyle(offset, offsetStyle);
        source.bringToFront();
        label('known hard shape: inspect for loops and missing fragments', 0, 132);
      }
    }
  };

  function renderDemo(card) {
    var canvas = card.querySelector('canvas[data-demo]');
    var demo = demos[canvas.dataset.demo];
    var code = card.querySelector('pre code');

    if (!demo) {
      return;
    }

    code.textContent = demo.code;
    paper.setup(canvas);
    paper.project.activeLayer.removeChildren();
    paper.view.center = [0, 0];

    try {
      demo.draw();
    } catch (error) {
      console.error(error);
      label('Demo failed. Check the console for details.', 0, 0);
    }

    paper.view.update();
  }

  function runDemos() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-demo-card]'), renderDemo);
  }

  window.addEventListener('DOMContentLoaded', runDemos);
})();
