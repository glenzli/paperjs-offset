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

  function add(cases, id, title, kind, operation, distance, options, draw, expectations) {
    cases.push(Object.assign({
      id: id,
      title: title,
      kind: kind,
      operation: operation,
      distance: distance,
      options: options || {},
      draw: draw
    }, expectations || {}));
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
      function() { return makeHookWithHole(); },
      { allowEmpty: true });

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
      ['deep-subdivision-in', 'Deep subdivision inward', 'offset', -19.407823289744556, { join: 'miter', limit: 4 }, function() {
        return new paper.Path({
          pathData: 'M69.9548,0.10722c-11.79924,11.09869 -41.44583,12.54592 -49.75155,16.02362c-8.30572,3.4777 4.72942,8.98588 2.14647,18.91414c-2.58295,9.92826 -20.78398,24.2766 -37.17772,27.67717c-16.39374,3.40057 -30.98019,-4.14663 -27.37924,-15.00638c3.60095,-10.85975 25.3893,-25.03204 17.31218,-40.15593c-8.07712,-15.12389 -46.0197,-31.19938 -48.97284,-37.14421c-2.95314,-5.94483 29.08315,-1.75899 44.00762,-10.2345c14.92446,-8.4755 12.73709,-29.61234 15.83183,-28.52174c3.09474,1.0906 11.4716,24.40865 26.24635,30.7047c14.77476,6.29605 35.94742,-4.42991 49.62001,0.67817c13.67259,5.10807 19.91613,25.96627 8.11688,37.06497z',
          insert: false
        });
      }],
      ['closed-fragment-in', 'Closed path fragment cleanup', 'offset', -14.979941526893526, { join: 'bevel', limit: 4 }, function() {
        return new paper.Path({
          pathData: 'M49.09129,0.05835c-10.45768,21.49507 17.84943,36.19836 17.2996,35.56729c-0.54983,-0.63107 -29.9566,-16.5965 -46.27402,-0.50183c-16.31742,16.09467 -19.5455,64.24943 -21.26117,63.26715c-1.71568,-0.98227 -1.91896,-51.10158 -18.31021,-61.82711c-16.39126,-10.72553 -48.97049,17.94272 -65.82464,15.68515c-16.85415,-2.25757 -17.98321,-35.44095 -16.15188,-61.22194c1.83133,-25.78099 6.62305,-44.15958 18.47229,-45.86052c11.84924,-1.70094 30.75599,13.27578 44.4359,-1.94892c13.67991,-15.22469 22.13298,-60.65079 25.39957,-53.47417c3.26659,7.17662 1.34671,66.95595 28.98636,80.95839c27.63965,14.00244 84.83884,-17.77201 88.84231,-19.1933c4.00346,-1.42129 -45.15644,27.05473 -55.61412,48.54979z',
          insert: false
        });
      }],
      ['fully-eroded-polygon-in', 'Fully eroded polygon inward', 'offset', -16.15878562722355, { join: 'round', limit: 4 }, function() {
        return new paper.Path({
          pathData: 'M33.55739,-10.26909l-31.08343,25.19445l-14.08615,-10.79424l1.98763,-13.4416l26.50794,-25.33233z',
          insert: false
        });
      }, { allowEmpty: true }],
      ['jagged-silhouette-out', 'Jagged silhouette outward', 'offset', 10, {}, function() {
        return makeJaggedSilhouette();
      }]
    ].forEach(function(item) {
      add(cases, item[0], item[1], 'edge-case', item[2], item[3], item[4], item[5], item[6]);
    });

    return cases;
  }

  return createStressCases();
});
