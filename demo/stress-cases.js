(function(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory;
  } else {
    root.createStressCases = factory;
  }
})(this, function(paper) {
  function point(cx, cy, radius, angle) {
    return [
      cx + Math.cos(angle) * radius,
      cy + Math.sin(angle) * radius
    ];
  }

  function makePolygon(center, radii, rotation) {
    var segments = [];
    for (var i = 0; i < radii.length; i += 1) {
      segments.push(point(center[0], center[1], radii[i], rotation + Math.PI * 2 * i / radii.length));
    }
    return new paper.Path({ segments: segments, closed: true, insert: false });
  }

  function makeStarRadii(points, outerRadius, innerRadius, seed) {
    var radii = [];
    for (var i = 0; i < points * 2; i += 1) {
      var wobble = Math.sin(seed * 1.91 + i * 0.73);
      radii.push(i % 2 === 0
        ? outerRadius + wobble * 2
        : innerRadius + wobble * 1.5);
    }
    return radii;
  }

  function makeSmoothPolygon(center, radii, rotation) {
    var path = makePolygon(center, radii, rotation);
    path.smooth({ type: 'continuous' });
    return path;
  }

  function makeOpenPath(points, smooth) {
    var path = new paper.Path({ segments: points, closed: false, insert: false });
    if (smooth) {
      path.smooth({ type: 'continuous' });
    }
    path.strokeColor = 'black';
    return path;
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

  function add(cases, id, title, kind, operation, distance, options, draw) {
    cases.push({
      id: id,
      title: title,
      kind: kind,
      operation: operation,
      distance: distance,
      options: options || {},
      draw: draw
    });
  }

  function createStressCases() {
    var cases = [];
    var rotations = [0, 0.17, 0.39, 0.61];
    var starConfigs = [
      { points: 5, outer: 58, inner: 31, out: 10, inward: -5, outJoin: 'round', inJoin: 'round' },
      { points: 6, outer: 60, inner: 34, out: 11, inward: -6, outJoin: 'round', inJoin: 'bevel' },
      { points: 7, outer: 62, inner: 36, out: 12, inward: -6, outJoin: 'round', inJoin: 'round' },
      { points: 8, outer: 64, inner: 38, out: 10, inward: -7, outJoin: 'round', inJoin: 'bevel' },
      { points: 9, outer: 66, inner: 40, out: 11, inward: -6, outJoin: 'miter', inJoin: 'round' },
      { points: 10, outer: 68, inner: 42, out: 12, inward: -7, outJoin: 'round', inJoin: 'round' },
      { points: 5, outer: 70, inner: 36, out: 11, inward: -6, outJoin: 'round', inJoin: 'bevel' },
      { points: 6, outer: 72, inner: 39, out: 12, inward: -7, outJoin: 'miter', inJoin: 'round' },
      { points: 7, outer: 74, inner: 42, out: 13, inward: -7, outJoin: 'round', inJoin: 'round' },
      { points: 8, outer: 72, inner: 43, out: 10, inward: -6, outJoin: 'round', inJoin: 'bevel' },
      { points: 9, outer: 74, inner: 45, out: 11, inward: -6, outJoin: 'round', inJoin: 'round' },
      { points: 10, outer: 76, inner: 46, out: 12, inward: -7, outJoin: 'round', inJoin: 'round' }
    ];

    for (var i = 0; i < starConfigs.length; i += 1) {
      (function(index) {
        var config = starConfigs[index];
        var radii = makeStarRadii(config.points, config.outer, config.inner, index);
        add(cases, 'star-positive-' + index, 'Star outward ' + index, 'closed-offset',
          'offset', config.out, { join: config.outJoin, limit: 4 },
          function() { return makePolygon([0, 0], radii, rotations[index % rotations.length]); });
        add(cases, 'star-negative-' + index, 'Star inward ' + index, 'closed-offset',
          'offset', config.inward, { join: config.inJoin, limit: 4 },
          function() { return makePolygon([0, 0], radii, rotations[(index + 1) % rotations.length]); });
      })(i);
    }

    for (var b = 0; b < 14; b += 1) {
      (function(index) {
        var count = 7 + index % 5;
        var radii = [];
        for (var j = 0; j < count; j += 1) {
          var wave = Math.sin(index * 1.7 + j * 2.1);
          radii.push(44 + wave * 18 + (j % 3 === 0 ? 18 : 0));
        }
        add(cases, 'smooth-blob-out-' + index, 'Smooth blob outward ' + index, 'smooth-offset',
          'offset', 12 + index % 4, { join: 'round', limit: 4 },
          function() { return makeSmoothPolygon([0, 0], radii, rotations[index % rotations.length]); });
        add(cases, 'smooth-blob-in-' + index, 'Smooth blob inward ' + index, 'smooth-offset',
          'offset', -(6 + index % 6), { join: 'round', limit: 4 },
          function() { return makeSmoothPolygon([0, 0], radii, rotations[(index + 2) % rotations.length]); });
      })(b);
    }

    for (var c = 0; c < 12; c += 1) {
      (function(index) {
        add(cases, 'circle-union-' + index, 'Circle union ' + index, 'compound-offset',
          'offset', index % 2 === 0 ? 14 : -9, { join: index % 3 === 0 ? 'miter' : 'round', limit: 5 },
          function() {
            var radius = 28 + index % 4 * 7;
            var paths = [
              new paper.Path.Circle({ center: [-30, -12], radius: radius + 14, insert: false }),
              new paper.Path.Circle({ center: [18 + index % 3 * 8, -18], radius: radius, insert: false }),
              new paper.Path.Circle({ center: [-4, 28 + index % 4 * 3], radius: radius - 2, insert: false })
            ];
            return unionAll(paths);
          });
      })(c);
    }

    for (var h = 0; h < 8; h += 1) {
      (function(index) {
        add(cases, 'hole-shape-' + index, 'Hole shape ' + index, 'compound-offset',
          'offset', index % 2 === 0 ? 9 : -7, { join: index % 2 === 0 ? 'round' : 'miter', limit: 4 },
          function() {
            var outer = makeSmoothPolygon([0, 0], [72, 58, 76, 54, 70, 62, 74, 52], index * 0.21);
            var cutters = [
              new paper.Path.Circle({ center: [-17, 0], radius: 13 + index % 3, insert: false }),
              new paper.Path.Circle({ center: [20, 8], radius: 10 + index % 4, insert: false })
            ];
            return subtractAll(outer, cutters);
          });
      })(h);
    }

    for (var n = 0; n < 10; n += 1) {
      (function(index) {
        var neck = 6 + index % 4;
        add(cases, 'narrow-neck-' + index, 'Narrow neck ' + index, 'closed-offset',
          'offset', index % 2 === 0 ? 11 : -5, { join: 'round', limit: 4 },
          function() {
            return new paper.Path({
              segments: [
                [-70, -32], [-20, -32], [-neck, -8], [neck, -8], [20, -32], [70, -32],
                [42, 8], [70, 42], [14, 28], [0, 70], [-14, 28], [-70, 42], [-42, 8]
              ],
              closed: true,
              insert: false
            });
          });
      })(n);
    }

    for (var o = 0; o < 16; o += 1) {
      (function(index) {
        var points = [
          [-74, -20],
          [-46, index % 2 === 0 ? -54 : 18],
          [-18, -22],
          [8, index % 3 === 0 ? 46 : -44],
          [38, -12],
          [70, index % 4 === 0 ? 34 : -28]
        ];
        add(cases, 'open-polyline-' + index, 'Open polyline ' + index, 'stroke-offset',
          'stroke', 8 + index % 7, { join: index % 2 === 0 ? 'round' : 'miter', cap: index % 3 === 0 ? 'round' : 'butt', limit: 5 },
          function() { return makeOpenPath(points, false); });
      })(o);
    }

    for (var q = 0; q < 12; q += 1) {
      (function(index) {
        add(cases, 'open-curve-' + index, 'Open curve ' + index, 'stroke-offset',
          'stroke', 10 + index % 6, { join: 'round', cap: index % 2 === 0 ? 'round' : 'butt', limit: 5 },
          function() {
            return makeOpenPath([
              [-74, 16],
              [-42, -48 + index % 3 * 12],
              [-8, 18],
              [32, -38 - index % 4 * 4],
              [74, 20]
            ], true);
          });
      })(q);
    }

    [
      ['tiny-line', 'Tiny open line', 'stroke', 14, { cap: 'round', join: 'round' }, function() {
        return makeOpenPath([[0, 0], [1, 2]], false);
      }],
      ['near-parallel-cusp', 'Near parallel cusp', 'stroke', 12, { cap: 'round', join: 'miter', limit: 3 }, function() {
        return makeOpenPath([[-60, 0], [-10, 1], [0, 0], [10, 1], [60, 0]], false);
      }],
      ['skinny-triangle-in', 'Skinny triangle inward', 'offset', -4, { join: 'miter', limit: 3 }, function() {
        return new paper.Path({ segments: [[-74, 42], [0, -44], [74, 42], [2, 34]], closed: true, insert: false });
      }],
      ['skinny-triangle-out', 'Skinny triangle outward', 'offset', 11, { join: 'miter', limit: 3 }, function() {
        return new paper.Path({ segments: [[-74, 42], [0, -44], [74, 42], [2, 34]], closed: true, insert: false });
      }],
      ['tight-cubic-in', 'Tight cubic inward', 'offset', -8, { join: 'round', limit: 4 }, function() {
        return new paper.Path({
          pathData: 'M-70,15 C-40,-70 12,76 42,-40 C96,38 -18,86 -70,15 Z',
          insert: false
        });
      }],
      ['tight-cubic-out', 'Tight cubic outward', 'offset', 12, { join: 'round', limit: 4 }, function() {
        return new paper.Path({
          pathData: 'M-70,15 C-40,-70 12,76 42,-40 C96,38 -18,86 -70,15 Z',
          insert: false
        });
      }]
    ].forEach(function(item) {
      add(cases, item[0], item[1], 'edge-case', item[2], item[3], item[4], item[5]);
    });

    return cases;
  }

  return createStressCases();
});
