(function (paper) {
  'use strict';

  paper = paper && Object.prototype.hasOwnProperty.call(paper, 'default') ? paper['default'] : paper;

  /**
   * Offset the start/terminal segment of a bezier curve
   * @param segment segment to offset
   * @param curve curve to offset
   * @param handleNormal the normal of the the line formed of two handles
   * @param offset offset value
   */
  function offsetSegment(segment, curve, handleNormal, offset) {
      var isFirst = segment.curve === curve;
      // get offset vector
      var offsetVector = (curve.getNormalAtTime(isFirst ? 0 : 1)).multiply(offset);
      // get offset point
      var point = segment.point.add(offsetVector);
      var newSegment = new paper.Segment(point);
      // handleOut for start segment & handleIn for terminal segment
      var handle = (isFirst ? 'handleOut' : 'handleIn');
      newSegment[handle] = segment[handle].add(handleNormal.subtract(offsetVector).divide(2));
      return newSegment;
  }
  /**
   * Adaptive offset a curve by repeatly apply the approximation proposed by Tiller and Hanson.
   * @param curve curve to offset
   * @param offset offset value
   */
  function adaptiveOffsetCurve(curve, offset) {
      var hNormal = (new paper.Curve(curve.segment1.handleOut.add(curve.segment1.point), new paper.Point(0, 0), new paper.Point(0, 0), curve.segment2.handleIn.add(curve.segment2.point))).getNormalAtTime(0.5).multiply(offset);
      var segment1 = offsetSegment(curve.segment1, curve, hNormal, offset);
      var segment2 = offsetSegment(curve.segment2, curve, hNormal, offset);
      // divide && re-offset
      var offsetCurve = new paper.Curve(segment1, segment2);
      // if the offset curve is not self intersected, divide it
      if (offsetCurve.getIntersections(offsetCurve).length === 0) {
          var threshold = Math.min(Math.abs(offset) / 10, 1);
          var midOffset = offsetCurve.getPointAtTime(0.5).getDistance(curve.getPointAtTime(0.5));
          if (Math.abs(midOffset - Math.abs(offset)) > threshold) {
              var subCurve = curve.divideAtTime(0.5);
              if (subCurve != null) {
                  return adaptiveOffsetCurve(curve, offset).concat(adaptiveOffsetCurve(subCurve, offset));
              }
          }
      }
      return [segment1, segment2];
  }
  /**
   * Create a round join segment between two adjacent segments.
   */
  function makeRoundJoin(segment1, segment2, originPoint, radius) {
      var through = segment1.point.subtract(originPoint).add(segment2.point.subtract(originPoint))
          .normalize(Math.abs(radius)).add(originPoint);
      var arc = new paper.Path.Arc({ from: segment1.point, to: segment2.point, through: through, insert: false });
      segment1.handleOut = arc.firstSegment.handleOut;
      segment2.handleIn = arc.lastSegment.handleIn;
      return arc.segments.length === 3 ? arc.segments[1] : null;
  }
  function det(p1, p2) {
      return p1.x * p2.y - p1.y * p2.x;
  }
  /**
   * Get the intersection point of point based lines
   */
  function getPointLineIntersections(p1, p2, p3, p4) {
      var l1 = p1.subtract(p2);
      var l2 = p3.subtract(p4);
      var dl1 = det(p1, p2);
      var dl2 = det(p3, p4);
      return new paper.Point(dl1 * l2.x - l1.x * dl2, dl1 * l2.y - l1.y * dl2).divide(det(l1, l2));
  }
  /**
   * Connect two adjacent bezier curve, each curve is represented by two segments,
   * create different types of joins or simply removal redundant segment.
   */
  function connectAdjacentBezier(segments1, segments2, origin, joinType, offset, limit) {
      var curve1 = new paper.Curve(segments1[0], segments1[1]);
      var curve2 = new paper.Curve(segments2[0], segments2[1]);
      var intersection = curve1.getIntersections(curve2);
      var distance = segments1[1].point.getDistance(segments2[0].point);
      if (origin.isSmooth()) {
          segments2[0].handleOut = segments2[0].handleOut.project(origin.handleOut);
          segments2[0].handleIn = segments1[1].handleIn.project(origin.handleIn);
          segments2[0].point = segments1[1].point.add(segments2[0].point).divide(2);
          segments1.pop();
      }
      else {
          if (intersection.length === 0) {
              if (distance > Math.abs(offset) * 0.1) {
                  // connect
                  switch (joinType) {
                      case 'miter':
                          var join = getPointLineIntersections(curve1.point2, curve1.point2.add(curve1.getTangentAtTime(1)), curve2.point1, curve2.point1.add(curve2.getTangentAtTime(0)));
                          // prevent sharp angle
                          var joinOffset = Math.max(join.getDistance(curve1.point2), join.getDistance(curve2.point1));
                          if (joinOffset < Math.abs(offset) * limit) {
                              segments1.push(new paper.Segment(join));
                          }
                          break;
                      case 'round':
                          var mid = makeRoundJoin(segments1[1], segments2[0], origin.point, offset);
                          if (mid) {
                              segments1.push(mid);
                          }
                          break;
                  }
              }
              else {
                  segments2[0].handleIn = segments1[1].handleIn;
                  segments1.pop();
              }
          }
          else {
              var second1 = curve1.divideAt(intersection[0]);
              if (second1) {
                  var join = second1.segment1;
                  var second2 = curve2.divideAt(curve2.getIntersections(curve1)[0]);
                  join.handleOut = second2 ? second2.segment1.handleOut : segments2[0].handleOut;
                  segments1.pop();
                  segments2[0] = join;
              }
              else {
                  segments2[0].handleIn = segments1[1].handleIn;
                  segments1.pop();
              }
          }
      }
  }
  /**
   * Connect all the segments together.
   */
  function connectBeziers(rawSegments, join, source, offset, limit) {
      var originSegments = source.segments;
      var first = rawSegments[0].slice();
      for (var i = 0; i < rawSegments.length - 1; ++i) {
          connectAdjacentBezier(rawSegments[i], rawSegments[i + 1], originSegments[i + 1], join, offset, limit);
      }
      if (source.closed) {
          connectAdjacentBezier(rawSegments[rawSegments.length - 1], first, originSegments[0], join, offset, limit);
          rawSegments[0][0] = first[0];
      }
      return rawSegments;
  }
  function reduceSingleChildCompoundPath(path) {
      if (path.children.length === 1) {
          path = path.children[0];
          path.remove(); // remove from parent, this is critical, or the style attributes will be ignored
      }
      return path;
  }
  /** Normalize a path, always clockwise, non-self-intersection, ignore really small components, and no one-component compound path. */
  function normalize(path, areaThreshold) {
      if (areaThreshold === void 0) { areaThreshold = 0.01; }
      if (path.closed) {
          var ignoreArea_1 = Math.abs(path.area * areaThreshold);
          if (!path.clockwise) {
              path.reverse();
          }
          path = path.unite(path, { insert: false });
          if (path instanceof paper.CompoundPath) {
              path.children.filter(function (c) { return Math.abs(c.area) < ignoreArea_1; }).forEach(function (c) { return c.remove(); });
              if (path.children.length === 1) {
                  return reduceSingleChildCompoundPath(path);
              }
          }
      }
      return path;
  }
  function isSameDirection(partialPath, fullPath) {
      var offset1 = partialPath.segments[0].location.offset;
      var offset2 = partialPath.segments[Math.max(1, Math.floor(partialPath.segments.length / 2))].location.offset;
      var sampleOffset = (offset1 + offset2) / 3;
      var originOffset1 = fullPath.getNearestLocation(partialPath.getPointAt(sampleOffset)).offset;
      var originOffset2 = fullPath.getNearestLocation(partialPath.getPointAt(2 * sampleOffset)).offset;
      return originOffset1 < originOffset2;
  }
  /** Remove self intersection when offset is negative by point direction dectection. */
  function removeIntersection(path) {
      if (path.closed) {
          var newPath = path.unite(path, { insert: false });
          if (newPath instanceof paper.CompoundPath) {
              newPath.children.filter(function (c) {
                  if (c.segments.length > 1) {
                      return !isSameDirection(c, path);
                  }
                  else {
                      return true;
                  }
              }).forEach(function (c) { return c.remove(); });
              return reduceSingleChildCompoundPath(newPath);
          }
      }
      return path;
  }
  function getSegments(path) {
      if (path instanceof paper.CompoundPath) {
          return path.children.map(function (c) { return c.segments; }).flat();
      }
      else {
          return path.segments;
      }
  }
  /**
   * Remove impossible segments in negative offset condition.
   */
  function removeOutsiders(newPath, path) {
      var segments = getSegments(newPath).slice();
      segments.forEach(function (segment) {
          if (!path.contains(segment.point)) {
              segment.remove();
          }
      });
  }
  function preparePath(path, offset) {
      var source = path.clone({ insert: false });
      source.reduce({});
      if (!path.clockwise) {
          source.reverse();
          offset = -offset;
      }
      return [source, offset];
  }
  function offsetSimpleShape(path, offset, join, limit) {
      var _a;
      var source;
      _a = preparePath(path, offset), source = _a[0], offset = _a[1];
      var curves = source.curves.slice();
      var offsetCurves = curves.map(function (curve) { return adaptiveOffsetCurve(curve, offset); }).flat();
      var raws = [];
      for (var i = 0; i < offsetCurves.length; i += 2) {
          raws.push(offsetCurves.slice(i, i + 2));
      }
      var segments = connectBeziers(raws, join, source, offset, limit).flat();
      var newPath = removeIntersection(new paper.Path({ segments: segments, insert: false, closed: path.closed }));
      newPath.reduce({});
      if (source.closed && ((source.clockwise && offset < 0) || (!source.clockwise && offset > 0))) {
          removeOutsiders(newPath, path);
      }
      // recovery path
      if (source.clockwise !== path.clockwise) {
          newPath.reverse();
      }
      return normalize(newPath);
  }
  function makeRoundCap(from, to, offset) {
      var origin = from.point.add(to.point).divide(2);
      var normal = to.point.subtract(from.point).rotate(-90, new paper.Point(0, 0)).normalize(offset);
      var through = origin.add(normal);
      var arc = new paper.Path.Arc({ from: from.point, to: to.point, through: through, insert: false });
      return arc.segments;
  }
  function connectSide(outer, inner, offset, cap) {
      if (outer instanceof paper.CompoundPath) {
          var cs = outer.children.map(function (c) { return ({ c: c, a: Math.abs(c.area) }); });
          cs = cs.sort(function (c1, c2) { return c2.a - c1.a; });
          outer = cs[0].c;
      }
      var oSegments = outer.segments.slice();
      var iSegments = inner.segments.slice();
      switch (cap) {
          case 'round':
              var heads = makeRoundCap(iSegments[iSegments.length - 1], oSegments[0], offset);
              var tails = makeRoundCap(oSegments[oSegments.length - 1], iSegments[0], offset);
              var result = new paper.Path({ segments: heads.concat(oSegments, tails, iSegments), closed: true, insert: false });
              result.reduce({});
              return result;
          default: return new paper.Path({ segments: oSegments.concat(iSegments), closed: true, insert: false });
      }
  }
  function offsetSimpleStroke(path, offset, join, cap, limit) {
      offset = path.clockwise ? offset : -offset;
      var positiveOffset = offsetSimpleShape(path, offset, join, limit);
      var negativeOffset = offsetSimpleShape(path, -offset, join, limit);
      if (path.closed) {
          return positiveOffset.subtract(negativeOffset, { insert: false });
      }
      else {
          var inner = negativeOffset;
          var holes = new Array();
          if (negativeOffset instanceof paper.CompoundPath) {
              holes = negativeOffset.children.filter(function (c) { return c.closed; });
              holes.forEach(function (h) { return h.remove(); });
              inner = negativeOffset.children[0];
          }
          inner.reverse();
          var final = connectSide(positiveOffset, inner, offset, cap);
          if (holes.length > 0) {
              for (var _i = 0, holes_1 = holes; _i < holes_1.length; _i++) {
                  var hole = holes_1[_i];
                  final = final.subtract(hole, { insert: false });
              }
          }
          return final;
      }
  }
  function getNonSelfItersectionPath(path) {
      if (path.closed) {
          return path.unite(path, { insert: false });
      }
      return path;
  }
  function offsetPath(path, offset, join, limit) {
      var nonSIPath = getNonSelfItersectionPath(path);
      var result = nonSIPath;
      if (nonSIPath instanceof paper.Path) {
          result = offsetSimpleShape(nonSIPath, offset, join, limit);
      }
      else {
          var offsetParts = nonSIPath.children.map(function (c) {
              if (c.segments.length > 1) {
                  if (!isSameDirection(c, path)) {
                      c.reverse();
                  }
                  var offseted = offsetSimpleShape(c, offset, join, limit);
                  offseted = normalize(offseted);
                  if (offseted.clockwise !== c.clockwise) {
                      offseted.reverse();
                  }
                  if (offseted instanceof paper.CompoundPath) {
                      offseted.applyMatrix = true;
                      return offseted.children;
                  }
                  else {
                      return offseted;
                  }
              }
              else {
                  return null;
              }
          });
          var children = offsetParts.flat().filter(function (c) { return !!c; });
          result = new paper.CompoundPath({ children: children, insert: false });
      }
      result.copyAttributes(nonSIPath, false);
      result.remove();
      return result;
  }
  function offsetStroke(path, offset, join, cap, limit) {
      var nonSIPath = getNonSelfItersectionPath(path);
      var result = nonSIPath;
      if (nonSIPath instanceof paper.Path) {
          result = offsetSimpleStroke(nonSIPath, offset, join, cap, limit);
      }
      else {
          var children = nonSIPath.children.flatMap(function (c) {
              return offsetSimpleStroke(c, offset, join, cap, limit);
          });
          result = children.reduce(function (c1, c2) { return c1.unite(c2, { insert: false }); });
      }
      result.strokeWidth = 0;
      result.fillColor = nonSIPath.strokeColor;
      result.shadowBlur = nonSIPath.shadowBlur;
      result.shadowColor = nonSIPath.shadowColor;
      result.shadowOffset = nonSIPath.shadowOffset;
      return result;
  }

  var PaperOffset = /** @class */ (function () {
      function PaperOffset() {
      }
      PaperOffset.offset = function (path, offset, options) {
          options = options || {};
          var newPath = offsetPath(path, offset, options.join || 'miter', options.limit || 10);
          if (options.insert === undefined) {
              options.insert = true;
          }
          if (options.insert) {
              (path.parent || paper.project.activeLayer).addChild(newPath);
          }
          return newPath;
      };
      PaperOffset.offsetStroke = function (path, offset, options) {
          options = options || {};
          var newPath = offsetStroke(path, offset, options.join || 'miter', options.cap || 'butt', options.limit || 10);
          if (options.insert === undefined) {
              options.insert = true;
          }
          if (options.insert) {
              (path.parent || paper.project.activeLayer).addChild(newPath);
          }
          return newPath;
      };
      return PaperOffset;
  }());
  /**
   * @deprecated EXTEND existing paper module is not recommend anymore
   */
  function ExtendPaperJs(paperNs) {
      paperNs.Path.prototype.offset = function (offset, options) {
          return PaperOffset.offset(this, offset, options);
      };
      paperNs.Path.prototype.offsetStroke = function (offset, options) {
          return PaperOffset.offsetStroke(this, offset, options);
      };
      paperNs.CompoundPath.prototype.offset = function (offset, options) {
          return PaperOffset.offset(this, offset, options);
      };
      paperNs.CompoundPath.prototype.offsetStroke = function (offset, options) {
          return PaperOffset.offsetStroke(this, offset, options);
      };
  }

  ExtendPaperJs(paper);
  window.PaperOffset = {
      offset: PaperOffset.offset,
      offsetStroke: PaperOffset.offsetStroke,
  };

}(paper));
