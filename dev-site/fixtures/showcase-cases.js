(function(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory;
  } else {
    root.createShowcaseCases = factory;
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

  function makeRegularNeedleStar(center, points, outerRadius, innerRadius, rotation) {
    var radii = [];
    for (var i = 0; i < points * 2; i += 1) {
      radii.push(i % 2 === 0 ? outerRadius : innerRadius);
    }
    return makePolygon(center, radii, rotation);
  }

  function makeRosette(center, lobes, baseRadius, amplitude, rotation) {
    var count = lobes * 4;
    var step = Math.PI * 2 / count;
    var segments = [];
    for (var i = 0; i < count; i += 1) {
      var angle = rotation + step * i;
      var radius = baseRadius + amplitude * Math.cos(lobes * (angle - rotation));
      var radialDerivative = -amplitude * lobes * Math.sin(lobes * (angle - rotation));
      var tangent = new paper.Point(
        radialDerivative * Math.cos(angle) - radius * Math.sin(angle),
        radialDerivative * Math.sin(angle) + radius * Math.cos(angle)
      ).multiply(step / 3);
      segments.push({
        point: point(center[0], center[1], radius, angle),
        handleIn: tangent.negate(),
        handleOut: tangent
      });
    }
    return new paper.Path({ segments: segments, closed: true, insert: false });
  }

  function makePerforatedRosette() {
    var outer = makeRosette([0, 0], 6, 69, 7, -Math.PI / 2);
    if (!outer.clockwise) {
      outer.reverse();
    }
    var children = [outer];
    for (var hole = 0; hole < 6; hole += 1) {
      var holeCenter = point(0, 0, 38, -Math.PI / 2 + Math.PI * 2 * hole / 6);
      var child = makePolygon(holeCenter, [7, 7, 7, 7, 7, 7], -Math.PI / 2);
      if (child.clockwise) {
        child.reverse();
      }
      children.push(child);
    }
    return new paper.CompoundPath({ children: children, insert: false });
  }

  function makeNestedIslandCompound() {
    return new paper.CompoundPath({
      children: [
        { radius: 100, clockwise: true },
        { radius: 60, clockwise: false },
        { radius: 20, clockwise: true }
      ].map(function(contour) {
        var child = new paper.Path.Circle({
          center: [0, 0],
          radius: contour.radius,
          insert: false
        });
        if (child.clockwise !== contour.clockwise) {
          child.reverse();
        }
        return child;
      }),
      insert: false
    });
  }

  function makeOpenPath(points, smooth) {
    var path = new paper.Path({ segments: points, closed: false, insert: false });
    if (smooth) {
      path.smooth({ type: 'continuous' });
    }
    path.strokeColor = 'black';
    return path;
  }

  function add(cases, id, title, operation, distance, options, draw, expectations) {
    cases.push(Object.assign({
      id: id,
      title: title,
      kind: 'showcase-offset',
      operation: operation,
      distance: distance,
      options: options || {},
      draw: draw
    }, expectations || {}));
  }

  var cases = [];
  [-2, -4, -6].forEach(function(distance) {
    add(cases, 'regular-needle-star-in-' + Math.abs(distance),
      'Symmetric star erosion ' + distance,
      'offset', distance, { join: 'round', limit: 3 },
      function() {
        return makeRegularNeedleStar([0, 0], 8, 70, 9, -Math.PI / 2);
      }, { symmetryOrder: 8 });
  });
  add(cases, 'regular-needle-star-in-bevel',
    'Symmetric star bevel -4',
    'offset', -4, { join: 'bevel', limit: 3 },
    function() {
      return makeRegularNeedleStar([0, 0], 8, 70, 9, -Math.PI / 2);
    }, { symmetryOrder: 8 });
  add(cases, 'showcase-rounded-gear-out',
    'Rounded gear expansion',
    'offset', 8, { join: 'round', limit: 4 },
    function() {
      return makeRegularNeedleStar([0, 0], 12, 64, 46, -Math.PI / 2);
    }, { symmetryOrder: 12 });
  add(cases, 'showcase-rounded-gear-in',
    'Rounded gear contraction',
    'offset', -7, { join: 'round', limit: 4 },
    function() {
      return makeRegularNeedleStar([0, 0], 12, 64, 46, -Math.PI / 2);
    }, { symmetryOrder: 12 });
  add(cases, 'showcase-rosette-out',
    'Soft rosette expansion',
    'offset', 9, { join: 'round', limit: 4 },
    function() {
      return makeRosette([0, 0], 6, 56, 12, -Math.PI / 2);
    }, { symmetryOrder: 6 });
  add(cases, 'showcase-rosette-in',
    'Soft rosette contraction',
    'offset', -8, { join: 'round', limit: 4 },
    function() {
      return makeRosette([0, 0], 6, 56, 12, -Math.PI / 2);
    }, { symmetryOrder: 6 });
  add(cases, 'showcase-perforated-rosette-in',
    'Perforated rosette contraction',
    'offset', -5, { join: 'round', limit: 4 },
    function() {
      return makePerforatedRosette();
    }, { symmetryOrder: 6 });
  add(cases, 'showcase-orbit-ribbon',
    'Orbit ribbon outline',
    'stroke', 10, { join: 'round', cap: 'round', limit: 4 },
    function() {
      return makeOpenPath([
        [-76, 26], [-54, -30], [-20, 10], [14, -34], [46, 8], [76, -22]
      ], true);
    });
  add(cases, 'showcase-concentric-islands-out',
    'Concentric island expansion',
    'offset', 7, { join: 'round', limit: 4 },
    function() {
      return makeNestedIslandCompound();
    });
  add(cases, 'showcase-crown-ribbon',
    'Crown ribbon outline',
    'stroke', 9, { join: 'round', cap: 'round', limit: 4 },
    function() {
      return makeOpenPath([
        [-78, 38], [-56, -24], [-26, 14], [0, -48], [26, 14], [56, -24], [78, 38]
      ], false);
    });

  return cases;
});
