(function() {
  var WIDTH = 1280;
  var HEIGHT = 720;

  var palettes = [
    {
      source: { fillColor: 'rgba(23, 42, 58, 0.05)', strokeColor: '#172a3a', strokeWidth: 2.2 },
      layers: ['#f43f5e', '#f59e0b', '#14b8a6', '#2563eb', '#7c3aed']
    },
    {
      source: { fillColor: 'rgba(15, 118, 110, 0.06)', strokeColor: '#0f766e', strokeWidth: 2.2 },
      layers: ['#0f766e', '#84cc16', '#eab308', '#fb7185', '#1d4ed8']
    },
    {
      source: { fillColor: 'rgba(37, 99, 235, 0.06)', strokeColor: '#1e3a8a', strokeWidth: 2.2 },
      layers: ['#2563eb', '#06b6d4', '#22c55e', '#f97316', '#be123c']
    }
  ];

  function point(cx, cy, radius, angle) {
    return [
      cx + Math.cos(angle) * radius,
      cy + Math.sin(angle) * radius
    ];
  }

  function setStyle(item, style) {
    Object.keys(style).forEach(function(key) {
      item[key] = style[key];
    });
  }

  function hexToRgba(hex, alpha) {
    var value = hex.replace('#', '');
    var red = parseInt(value.slice(0, 2), 16);
    var green = parseInt(value.slice(2, 4), 16);
    var blue = parseInt(value.slice(4, 6), 16);
    return 'rgba(' + red + ', ' + green + ', ' + blue + ', ' + alpha + ')';
  }

  function layerStyle(color, index) {
    return {
      fillColor: hexToRgba(color, 0.1 + index * 0.018),
      strokeColor: color,
      strokeWidth: Math.max(1.4, 2.4 - index * 0.12)
    };
  }

  function makePolygon(center, radii, rotation) {
    var segments = [];
    for (var i = 0; i < radii.length; i += 1) {
      segments.push(point(center[0], center[1], radii[i], rotation + Math.PI * 2 * i / radii.length));
    }
    return new paper.Path({ segments: segments, closed: true, insert: false });
  }

  function makeNeedleStar(points, outerRadius, innerRadius, rotation, wobble) {
    var radii = [];
    for (var i = 0; i < points * 2; i += 1) {
      var wave = Math.sin(wobble + i * 1.31);
      radii.push(i % 2 === 0 ? outerRadius + wave * 5 : innerRadius + wave * 2);
    }
    return makePolygon([0, 0], radii, rotation);
  }

  function makeRegularStar(points, outerRadius, innerRadius, rotation) {
    var radii = [];
    for (var i = 0; i < points * 2; i += 1) {
      radii.push(i % 2 === 0 ? outerRadius : innerRadius);
    }
    return makePolygon([0, 0], radii, rotation);
  }

  function makeRoundedBox(width, height, radius) {
    return new paper.Path.Rectangle({
      point: [-width / 2, -height / 2],
      size: [width, height],
      radius: radius,
      insert: false
    });
  }

  function unionAll(paths) {
    var result = paths[0];
    for (var i = 1; i < paths.length; i += 1) {
      var next = result.unite(paths[i], { insert: false });
      result.remove();
      paths[i].remove();
      result = next;
    }
    return result;
  }

  function makeRegularCompound() {
    return unionAll([
      new paper.Path.Circle({ center: [-34, -8], radius: 52, insert: false }),
      new paper.Path.Circle({ center: [30, -12], radius: 44, insert: false }),
      new paper.Path.Circle({ center: [-4, 36], radius: 36, insert: false })
    ]);
  }

  function makeComb(teeth, width, top, bottom, bayDepth, skew) {
    var left = -width / 2;
    var step = width / (teeth * 2);
    var segments = [
      [left, bottom],
      [width / 2, bottom],
      [width / 2, top]
    ];

    for (var i = teeth - 1; i >= 0; i -= 1) {
      var right = left + (i * 2 + 2) * step;
      var middle = left + (i * 2 + 1) * step;
      var toothLeft = left + i * 2 * step;
      segments.push([right, top]);
      segments.push([middle + skew, top + bayDepth]);
      segments.push([toothLeft, top]);
    }

    return new paper.Path({ segments: segments, closed: true, insert: false });
  }

  function subtractAll(source, cutters) {
    var result = source;
    cutters.forEach(function(cutter) {
      var next = result.subtract(cutter, { insert: false });
      result.remove();
      cutter.remove();
      result = next;
    });
    return result;
  }

  function makePinHoleCompound(index) {
    var outer = makePolygon([0, 0], [86, 62, 82, 57, 76, 63, 88, 54, 72, 60], index * 0.17);
    outer.smooth({ type: 'continuous' });

    var cutters = [
      new paper.Path.Circle({ center: [-38, -8], radius: 13, insert: false }),
      new paper.Path.Circle({ center: [-9, 12], radius: 10, insert: false }),
      new paper.Path.Circle({ center: [23, -2], radius: 15, insert: false }),
      new paper.Path.Circle({ center: [48, 18], radius: 9, insert: false }),
      new paper.Path.Rectangle({ point: [-5, -66], size: [12, 132], radius: 3, insert: false })
    ];

    return subtractAll(outer, cutters);
  }

  function makeRibbonStroke() {
    var path = new paper.Path({
      segments: [
        [-118, -16],
        [-72, -64],
        [-22, -12],
        [24, -58],
        [72, -6],
        [120, -42]
      ],
      closed: false,
      insert: false
    });
    path.smooth({ type: 'continuous' });
    path.strokeColor = '#172a3a';
    return path;
  }

  function makeRegularStroke() {
    var path = new paper.Path({
      segments: [
        [-102, 18],
        [-62, -30],
        [-18, 14],
        [28, -28],
        [76, 8],
        [108, -22]
      ],
      closed: false,
      insert: false
    });
    path.smooth({ type: 'continuous' });
    path.strokeColor = '#172a3a';
    return path;
  }

  function drawGroupPanel(title, y, height) {
    new paper.Path.Rectangle({
      point: [28, y],
      size: [WIDTH - 56, height],
      radius: 10,
      fillColor: 'rgba(255, 255, 255, 0.62)',
      strokeColor: 'rgba(23, 42, 58, 0.1)',
      strokeWidth: 1
    });

    new paper.PointText({
      point: [54, y + 34],
      content: title,
      fillColor: '#334155',
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: 15,
      fontWeight: 700
    });
  }

  function drawGrid() {
    var grid = new paper.Group({ insert: true });
    for (var x = 0; x <= WIDTH; x += 40) {
      grid.addChild(new paper.Path.Line({
        from: [x, 0],
        to: [x, HEIGHT],
        strokeColor: 'rgba(23, 42, 58, 0.045)',
        strokeWidth: 1
      }));
    }
    for (var y = 0; y <= HEIGHT; y += 40) {
      grid.addChild(new paper.Path.Line({
        from: [0, y],
        to: [WIDTH, y],
        strokeColor: 'rgba(23, 42, 58, 0.045)',
        strokeWidth: 1
      }));
    }
  }

  function fitGroup(group, center, maxSize) {
    var bounds = group.bounds;
    var scale = Math.min(maxSize[0] / bounds.width, maxSize[1] / bounds.height);
    group.scale(scale);
    group.position = new paper.Point(center[0], center[1]);
  }

  function drawOffsetStack(source, distances, center, maxSize, palette, options) {
    var items = [];
    distances.slice().sort(function(a, b) {
      return Math.abs(b) - Math.abs(a);
    }).forEach(function(distance, index) {
      try {
        var layer = paperjsOffset.offset(source, distance, Object.assign({
          join: 'round',
          algorithm: 'auto',
          insert: false
        }, options || {}));
        setStyle(layer, layerStyle(palette.layers[index % palette.layers.length], index));
        items.push(layer);
      } catch (error) {
        // Preview pages should keep rendering other examples even when one fallback fails.
      }
    });

    setStyle(source, palette.source);
    items.push(source);
    var group = new paper.Group(items);
    paper.project.activeLayer.addChild(group);
    fitGroup(group, center, maxSize);
    source.bringToFront();
    return group;
  }

  function drawStrokeStack(source, distances, center, maxSize, palette) {
    var items = [];
    distances.slice().sort(function(a, b) {
      return b - a;
    }).forEach(function(distance, index) {
      try {
        var layer = paperjsOffset.offsetStroke(source, distance, {
          join: index % 2 === 0 ? 'round' : 'miter',
          cap: 'round',
          limit: 4,
          algorithm: 'auto',
          insert: false
        });
        setStyle(layer, layerStyle(palette.layers[index % palette.layers.length], index));
        items.push(layer);
      } catch (error) {
        // Keep the visual preview resilient.
      }
    });

    source.strokeColor = palette.source.strokeColor;
    source.strokeWidth = 4;
    source.fillColor = null;
    items.push(source);
    var group = new paper.Group(items);
    paper.project.activeLayer.addChild(group);
    fitGroup(group, center, maxSize);
    source.bringToFront();
  }

  function drawPreview() {
    var canvas = document.getElementById('preview-canvas');
    paper.setup(canvas);
    paper.project.activeLayer.removeChildren();

    new paper.Path.Rectangle({
      point: [0, 0],
      size: [WIDTH, HEIGHT],
      fillColor: '#fbfcfd',
      strokeColor: null
    });
    drawGrid();

    drawGroupPanel('Regular offset cases', 28, 300);
    drawGroupPanel('Boundary offset cases', 362, 330);

    drawOffsetStack(
      makeRegularStar(8, 72, 36, -0.1),
      [-16, -8, 12, 24],
      [168, 184],
      [210, 210],
      palettes[0],
      { join: 'round', limit: 4 }
    );

    drawOffsetStack(
      makeRoundedBox(132, 92, 18),
      [-14, -7, 11, 22],
      [432, 184],
      [210, 180],
      palettes[1],
      { join: 'round', limit: 4 }
    );

    drawOffsetStack(
      makeRegularCompound(),
      [-12, -6, 10, 20],
      [704, 184],
      [230, 200],
      palettes[2],
      { join: 'round', limit: 4 }
    );

    drawStrokeStack(
      makeRegularStroke(),
      [8, 14, 21],
      [1022, 184],
      [270, 170],
      palettes[0]
    );

    drawOffsetStack(
      makeNeedleStar(14, 96, 8, 0.19, 2.1),
      [-5, -3, 10, 18, 28, 38],
      [214, 532],
      [310, 290],
      palettes[2],
      { join: 'miter', limit: 3 }
    );

    drawOffsetStack(
      makePinHoleCompound(7),
      [-8, -4, 7, 15, 24, 34],
      [574, 532],
      [310, 290],
      palettes[0],
      { join: 'round', limit: 4 }
    );

    drawOffsetStack(
      makeComb(8, 168, -55, 48, 58, 3),
      [-7, -4, 8, 16, 24],
      [852, 532],
      [250, 250],
      palettes[2],
      { join: 'round', limit: 3 }
    );

    drawStrokeStack(
      makeRibbonStroke().rotate(-14),
      [9, 16, 24, 33],
      [1100, 532],
      [260, 210],
      palettes[1]
    );

    paper.view.update();
  }

  window.addEventListener('DOMContentLoaded', drawPreview);
})();
