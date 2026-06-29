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

  function makeSmoothPolygon(center, radii, rotation) {
    var path = makePolygon(center, radii, rotation);
    path.smooth({ type: 'continuous' });
    return path;
  }

  function makeNeedleStar(center, points, outerRadius, innerRadius, rotation, wobble) {
    var radii = [];
    for (var i = 0; i < points * 2; i += 1) {
      var wave = Math.sin(wobble + i * 1.31);
      radii.push(i % 2 === 0
        ? outerRadius + wave * 4
        : innerRadius + wave * 2);
    }
    return makePolygon(center, radii, rotation);
  }

  function makeComb(center, teeth, width, top, bottom, bayDepth, skew) {
    var left = center[0] - width / 2;
    var step = width / (teeth * 2);
    var segments = [
      [left, center[1] + bottom],
      [center[0] + width / 2, center[1] + bottom],
      [center[0] + width / 2, center[1] + top]
    ];
    for (var i = teeth - 1; i >= 0; i -= 1) {
      var right = left + (i * 2 + 2) * step;
      var middle = left + (i * 2 + 1) * step;
      var toothLeft = left + i * 2 * step;
      segments.push([right, center[1] + top]);
      segments.push([middle + skew, center[1] + top + bayDepth]);
      segments.push([toothLeft, center[1] + top]);
    }
    return new paper.Path({ segments: segments, closed: true, insert: false });
  }

  function makePinHoleCompound(index) {
    var outer = new paper.Path.Rectangle({
      point: [-74, -50],
      size: [148, 100],
      insert: false
    });
    var cutters = [];
    for (var i = 0; i < 3; i += 1) {
      cutters.push(new paper.Path.Circle({
        center: [
          -34 + i * 34 + (index % 2 === 0 ? 0 : 4),
          Math.sin(index + i * 0.8) * 13
        ],
        radius: 8 + (index + i) % 4,
        insert: false
      }));
    }
    return subtractAll(outer, cutters);
  }

  function makeRectCircleHole(width, height, radius) {
    var rect = new paper.Path.Rectangle({
      point: [-width / 2, -height / 2],
      size: [width, height],
      insert: false
    });
    var circle = new paper.Path.Circle({
      center: [0, 0],
      radius: radius,
      insert: false
    });
    return subtractAll(rect, [circle]);
  }

  function makeHookWithHole() {
    var outer = new paper.Path({ insert: false, closed: true });
    outer.moveTo([75, 470]);
    outer.lineTo([75, 94]);
    outer.lineTo([257, 94]);
    outer.cubicCurveTo([257, 205], [273, 300], [336, 356]);
    outer.cubicCurveTo([393, 408], [470, 447], [540, 470]);
    outer.lineTo([75, 470]);

    return subtractAll(outer, [
      new paper.Path.Circle({
        center: [196, 349],
        radius: 62,
        insert: false
      })
    ]);
  }

  function makeJaggedSilhouette() {
    return new paper.Path({
      segments: [
        [74, 30], [95, 60], [103, 35], [108, 49], [119, 41], [129, 58],
        [131, 75], [125, 84], [130, 95], [149, 103], [128, 110], [121, 132],
        [116, 153], [107, 181], [92, 193], [76, 196], [63, 190], [50, 174],
        [47, 156], [55, 140], [65, 128], [61, 116], [54, 104], [58, 87],
        [72, 84], [76, 72], [88, 70], [94, 57]
      ],
      closed: true,
      insert: false
    });
  }

  function makeHairpin(index) {
    var gap = 5 + index % 4;
    var height = 42 + index % 5 * 4;
    return makeOpenPath([
      [-76, -height],
      [-26, -height],
      [-26, height],
      [-26 + gap, height],
      [-26 + gap, -height + 8],
      [20, -height + 8],
      [20, height - 8],
      [70, height - 8]
    ], index % 2 === 0);
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

    for (var i = 0; i < 12; i += 1) {
      (function(index) {
        var points = 5 + index % 7;
        var radii = [];
        for (var j = 0; j < points * 2; j += 1) {
          radii.push(j % 2 === 0 ? 58 + index * 2 : 15 + (index * 7 + j * 3) % 22);
        }
        add(cases, 'star-positive-' + index, 'Star outward ' + index, 'closed-offset',
          'offset', 10 + index % 5, { join: index % 3 === 0 ? 'miter' : 'round', limit: 4 },
          function() { return makePolygon([0, 0], radii, rotations[index % rotations.length]); });
        add(cases, 'star-negative-' + index, 'Star inward ' + index, 'closed-offset',
          'offset', -(7 + index % 6), { join: index % 2 === 0 ? 'round' : 'bevel', limit: 4 },
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

    for (var ns = 0; ns < 10; ns += 1) {
      (function(index) {
        var points = 8 + index % 5;
        add(cases, 'needle-star-out-' + index, 'Needle star outward ' + index, 'boundary-offset',
          'offset', 13 + index % 5, { join: index % 2 === 0 ? 'miter' : 'round', limit: 3 },
          function() {
            return makeNeedleStar([0, 0], points, 70 + index * 2, 9 + index % 4, rotations[index % rotations.length], index * 0.71);
          });
        add(cases, 'needle-star-in-' + index, 'Needle star inward ' + index, 'boundary-offset',
          'offset', -(4 + index % 4), { join: index % 2 === 0 ? 'round' : 'bevel', limit: 3 },
          function() {
            return makeNeedleStar([0, 0], points, 70 + index * 2, 9 + index % 4, rotations[(index + 1) % rotations.length], index * 0.71);
          });
      })(ns);
    }

    for (var cb = 0; cb < 10; cb += 1) {
      (function(index) {
        var teeth = 5 + index % 5;
        add(cases, 'comb-bays-out-' + index, 'Comb bays outward ' + index, 'boundary-offset',
          'offset', 9 + index % 4, { join: index % 3 === 0 ? 'miter' : 'round', limit: 3 },
          function() {
            return makeComb([0, 0], teeth, 138, -46, 42, 42 + index % 4 * 4, index % 2 === 0 ? 0 : 3);
          });
        add(cases, 'comb-bays-in-' + index, 'Comb bays inward ' + index, 'boundary-offset',
          'offset', -(4 + index % 4), { join: 'round', limit: 3 },
          function() {
            return makeComb([0, 0], teeth, 138, -46, 42, 42 + index % 4 * 4, index % 2 === 0 ? 0 : 3);
          });
      })(cb);
    }

    for (var ph = 0; ph < 3; ph += 1) {
      (function(index) {
        add(cases, 'pin-hole-out-' + index, 'Pin-hole compound outward ' + index, 'boundary-compound',
          'offset', 7 + index % 4, { join: 'round', limit: 4 },
          function() { return makePinHoleCompound(index); });
        add(cases, 'pin-hole-in-' + index, 'Pin-hole compound inward ' + index, 'boundary-compound',
          'offset', -(3 + index % 3), { join: index % 2 === 0 ? 'round' : 'miter', limit: 3 },
          function() { return makePinHoleCompound(index); });
      })(ph);
    }

    add(cases, 'rect-circle-hole-in', 'Rect circle hole inward', 'boundary-compound',
      'offset', -36.675, { join: 'miter', limit: 10 },
      function() { return makeRectCircleHole(386, 350, 163); });

    add(cases, 'hook-hole-in', 'Hook shape with hole inward', 'boundary-compound',
      'offset', -140, { join: 'miter', limit: 10 },
      function() { return makeHookWithHole(); });

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

    for (var hp = 0; hp < 12; hp += 1) {
      (function(index) {
        add(cases, 'hairpin-stroke-' + index, 'Hairpin stroke ' + index, 'boundary-stroke',
          'stroke', 9 + index % 7, { join: index % 2 === 0 ? 'miter' : 'round', cap: index % 3 === 0 ? 'butt' : 'round', limit: 3 },
          function() { return makeHairpin(index); });
      })(hp);
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
      }],
      ['jagged-silhouette-out', 'Jagged silhouette outward', 'offset', 10, {}, function() {
        return makeJaggedSilhouette();
      }]
    ].forEach(function(item) {
      add(cases, item[0], item[1], 'edge-case', item[2], item[3], item[4], item[5]);
    });

    return cases;
  }

  return createStressCases();
});
