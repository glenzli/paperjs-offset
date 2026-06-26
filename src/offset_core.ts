import paper from 'paper';

export type StrokeJoinType = 'miter' | 'bevel' | 'round';
export type StrokeCapType = 'round' | 'butt';
export type OffsetAlgorithm = 'auto' | 'legacy' | 'split' | 'robust';
export type PathType = paper.Path | paper.CompoundPath;
const MAX_RECURSION_TIME = 20;
type HandleType = 'handleIn' | 'handleOut';

interface OffsetStrategy {
  algorithm: Exclude<OffsetAlgorithm, 'auto'>;
  splitSelfIntersectingCurves: boolean;
  guardInsideJoins: boolean;
  simplifySelfIntersectingStroke: boolean;
}

export interface OffsetQuality {
  algorithm?: OffsetAlgorithm;
  score: number;
  warnings: string[];
  selfIntersections: number;
  containmentErrors: number;
  distanceErrors: number;
  segmentCount: number;
  area: number;
}

export interface OffsetQualityOptions {
  stroke?: boolean;
}

const STRATEGIES: OffsetStrategy[] = [
  {
    algorithm: 'robust',
    splitSelfIntersectingCurves: true,
    guardInsideJoins: true,
    simplifySelfIntersectingStroke: true,
  },
  {
    algorithm: 'split',
    splitSelfIntersectingCurves: true,
    guardInsideJoins: false,
    simplifySelfIntersectingStroke: false,
  },
  {
    algorithm: 'legacy',
    splitSelfIntersectingCurves: false,
    guardInsideJoins: false,
    simplifySelfIntersectingStroke: false,
  },
];

function getStrategy(algorithm: OffsetAlgorithm): OffsetStrategy {
  if (algorithm === 'auto') {
    return STRATEGIES[0];
  }
  return STRATEGIES.filter((strategy) => strategy.algorithm === algorithm)[0] || STRATEGIES[0];
}

/**
 * Offset the start/terminal segment of a bezier curve
 * @param segment segment to offset
 * @param curve curve to offset
 * @param handleNormal the normal of the the line formed of two handles
 * @param offset offset value
 */
function offsetSegment(segment: paper.Segment, curve: paper.Curve, handleNormal: paper.Point, offset: number) {
  const isFirst = segment.curve === curve;
  // get offset vector
  const offsetVector = (curve.getNormalAtTime(isFirst ? 0 : 1)).multiply(offset);
  // get offset point
  const point = segment.point.add(offsetVector);
  const newSegment = new paper.Segment(point);
  // handleOut for start segment & handleIn for terminal segment
  const handle = (isFirst ? 'handleOut' : 'handleIn') as HandleType;
  newSegment[handle] = segment[handle]!.add(handleNormal.subtract(offsetVector).divide(2));
  return newSegment;
}

/**
 * Adaptive offset a curve by repeatly apply the approximation proposed by Tiller and Hanson.
 * @param curve curve to offset
 * @param offset offset value
 */
function adaptiveOffsetCurve(curve: paper.Curve, offset: number, strategy: OffsetStrategy, recursionTime = 0): paper.Segment[] {
  const hNormal = (new paper.Curve(curve.segment1.handleOut!.add(curve.segment1.point), new paper.Point(0, 0),
    new paper.Point(0, 0), curve.segment2.handleIn!.add(curve.segment2.point))).getNormalAtTime(0.5).multiply(offset);
  const segment1 = offsetSegment(curve.segment1, curve, hNormal, offset);
  const segment2 = offsetSegment(curve.segment2, curve, hNormal, offset);
  if (recursionTime > MAX_RECURSION_TIME) {
    return [segment1, segment2];
  }
  // divide && re-offset
  const offsetCurve = new paper.Curve(segment1, segment2);
  const offsetCurveIntersections = offsetCurve.getIntersections(offsetCurve);
  const threshold = Math.min(Math.abs(offset) / 10, 1);
  const midOffset = offsetCurve.getPointAtTime(0.5).getDistance(curve.getPointAtTime(0.5));
  const needsSplit = strategy.splitSelfIntersectingCurves
    ? offsetCurveIntersections.length > 0 || Math.abs(midOffset - Math.abs(offset)) > threshold
    : offsetCurveIntersections.length === 0 && Math.abs(midOffset - Math.abs(offset)) > threshold;
  if (needsSplit) {
    const subCurve = curve.divideAtTime(0.5);
    if (subCurve != null) {
      return adaptiveOffsetCurve(curve, offset, strategy, recursionTime + 1)
        .concat(adaptiveOffsetCurve(subCurve, offset, strategy, recursionTime + 1));
    }
  }
  return [segment1, segment2];
}

/**
 * Create a round join segment between two adjacent segments.
 */
function makeRoundJoin(segment1: paper.Segment, segment2: paper.Segment, originPoint: paper.Point, radius: number) {
  const through = segment1.point.subtract(originPoint).add(segment2.point.subtract(originPoint))
    .normalize(Math.abs(radius)).add(originPoint);
  const arc = new paper.Path.Arc({ from: segment1.point, to: segment2.point, through, insert: false });
  segment1.handleOut = arc.firstSegment.handleOut;
  segment2.handleIn = arc.lastSegment.handleIn;
  return arc.segments.length === 3 ? arc.segments[1] : null;
}

function det(p1: paper.Point, p2: paper.Point) {
  return p1.x * p2.y - p1.y * p2.x;
}

/**
 * Get the intersection point of point based lines
 */
function getPointLineIntersections(p1: paper.Point, p2: paper.Point, p3: paper.Point, p4: paper.Point) {
  const l1 = p1.subtract(p2);
  const l2 = p3.subtract(p4);
  const dl1 = det(p1, p2);
  const dl2 = det(p3, p4);
  return new paper.Point(dl1 * l2.x - l1.x * dl2, dl1 * l2.y - l1.y * dl2).divide(det(l1, l2));
}

/**
 * Connect two adjacent bezier curve, each curve is represented by two segments,
 * create different types of joins or simply removal redundant segment.
 */
function isOutsideJoin(origin: paper.Segment, offset: number) {
  const previousCurve = origin.previous?.curve;
  const nextCurve = origin.curve;
  if (!previousCurve || !nextCurve) {
    return true;
  }
  const tangentIn = previousCurve.getTangentAtTime(1);
  const tangentOut = nextCurve.getTangentAtTime(0);
  const turn = det(tangentIn, tangentOut);
  return Math.abs(turn) < 1e-9 || turn * offset > 0;
}

function connectAdjacentBezier(segments1: paper.Segment[], segments2: paper.Segment[], origin: paper.Segment, joinType: StrokeJoinType, offset: number, limit: number, closed: boolean, strategy: OffsetStrategy) {
  const curve1 = new paper.Curve(segments1[0], segments1[1]);
  const curve2 = new paper.Curve(segments2[0], segments2[1]);
  const intersection = curve1.getIntersections(curve2);
  const distance = segments1[1].point.getDistance(segments2[0].point);
  const shouldJoin = !closed || !strategy.guardInsideJoins || isOutsideJoin(origin, offset);
  if (origin.isSmooth()) {
    segments2[0].handleOut = segments2[0].handleOut!.project(origin.handleOut!);
    segments2[0].handleIn = segments1[1].handleIn!.project(origin.handleIn!);
    segments2[0].point = segments1[1].point.add(segments2[0].point).divide(2);
    segments1.pop();
  } else {
    if (intersection.length === 0) {
      if (distance > Math.abs(offset) * 0.1) {
        // connect
        switch (joinType) {
          case 'miter':
            if (shouldJoin) {
              const join = getPointLineIntersections(curve1.point2, curve1.point2.add(curve1.getTangentAtTime(1)),
                curve2.point1, curve2.point1.add(curve2.getTangentAtTime(0)));
              // prevent sharp angle
              const joinOffset = Math.max(join.getDistance(curve1.point2), join.getDistance(curve2.point1));
              if (joinOffset < Math.abs(offset) * limit) {
                segments1.push(new paper.Segment(join));
              }
            }
            break;
          case 'round':
            if (shouldJoin) {
              const mid = makeRoundJoin(segments1[1], segments2[0], origin.point, offset);
              if (mid) {
                segments1.push(mid);
              }
            }
            break;
          default: break;
        }
      } else {
        segments2[0].handleIn = segments1[1].handleIn;
        segments1.pop();
      }
    } else {
      const second1 = curve1.divideAt(intersection[0]);
      if (second1) {
        const join = second1.segment1;
        const second2 = curve2.divideAt(curve2.getIntersections(curve1)[0]);
        join.handleOut = second2 ? second2.segment1.handleOut : segments2[0].handleOut;
        segments1.pop();
        segments2[0] = join;
      } else {
        segments2[0].handleIn = segments1[1].handleIn;
        segments1.pop();
      }
    }
  }
}

/**
 * Connect all the segments together.
 */
function connectBeziers(rawSegments: paper.Segment[][], join: StrokeJoinType, source: paper.Path, offset: number, limit: number, strategy: OffsetStrategy) {
  const originSegments = source.segments;
  const first = rawSegments[0].slice();
  for (let i = 0; i < rawSegments.length - 1; ++i) {
    connectAdjacentBezier(rawSegments[i], rawSegments[i + 1], originSegments[i + 1], join, offset, limit, source.closed, strategy);
  }
  if (source.closed) {
    connectAdjacentBezier(rawSegments[rawSegments.length - 1], first, originSegments[0], join, offset, limit, source.closed, strategy);
    rawSegments[0][0] = first[0];
  }
  return rawSegments;
}

function reduceSingleChildCompoundPath(path: PathType) {
  if (path.children.length === 1) {
    path = path.children[0] as paper.Path;
    path.remove(); // remove from parent, this is critical, or the style attributes will be ignored
  }
  return path;
}

/** Normalize a path, always clockwise, non-self-intersection, ignore really small components, and no one-component compound path. */
function normalize(path: PathType, areaThreshold = 0.01) {
  if (path.closed) {
    const ignoreArea = Math.abs(path.area * areaThreshold);
    if (!path.clockwise) {
      path.reverse();
    }
    path = path.unite(path, { insert: false }) as PathType;
    path = (path as any).resolveCrossings() as PathType;
    if (path instanceof paper.CompoundPath) {
      path.children.filter((c) => Math.abs((c as PathType).area) < ignoreArea).forEach((c) => c.remove());
      if (path.children.length === 1) {
        return reduceSingleChildCompoundPath(path);
      }
    }
  }
  return path;
}

function cleanupStrokeOutline(path: PathType, offset: number, strategy: OffsetStrategy) {
  let result = normalize(path);
  if (strategy.simplifySelfIntersectingStroke && countSelfIntersections(result) > 0) {
    const simplified = result.clone({ insert: false }) as PathType;
    (simplified as any).simplify(Math.max(Math.min(Math.abs(offset) * 0.02, 0.5), 0.1));
    result = normalize(simplified);
  }
  return result;
}

function isSameDirection(partialPath: paper.Path, fullPath: PathType) {
  const offset1 = partialPath.segments[0].location.offset;
  const offset2 = partialPath.segments[Math.max(1, Math.floor(partialPath.segments.length / 2))].location.offset;
  const sampleOffset = (offset1 + offset2) / 3;
  const originOffset1 = fullPath.getNearestLocation(partialPath.getPointAt(sampleOffset)).offset;
  const originOffset2 = fullPath.getNearestLocation(partialPath.getPointAt(2 * sampleOffset)).offset;
  return originOffset1 < originOffset2;
}

/** Remove self intersection when offset is negative by point direction dectection. */
function removeIntersection(path: PathType) {
  if (path.closed) {
    const newPath = path.unite(path, { insert: false }) as PathType;
    if (newPath instanceof paper.CompoundPath) {
      (newPath.children as paper.Path[]).filter((c) => {
        if (c.segments.length > 1) {
          return !isSameDirection(c, path);
        } else {
          return true;
        }
      }).forEach((c) => c.remove());
      return reduceSingleChildCompoundPath(newPath);
    }
  }
  return path;
}

function getSegments(path: PathType) {
  if (path instanceof paper.CompoundPath) {
    return path.children.map((c) => (c as paper.Path).segments).flat();
  } else {
    return (path as paper.Path).segments;
  }
}

/**
 * Remove impossible segments in negative offset condition.
 */
function removeOutsiders(newPath: PathType, path: PathType) {
  const segments = getSegments(newPath).slice();
  segments.forEach((segment) => {
    if (!path.contains(segment.point)) {
      segment.remove();
    }
  });
}

function preparePath(path: paper.Path, offset: number): [paper.Path, number] {
  const source = path.clone({ insert: false }) as paper.Path;
  source.reduce({});
  if (path.closed && !path.clockwise) {
    source.reverse();
    offset = -offset;
  }
  return [source, offset];
}

function offsetSimpleShape(path: paper.Path, offset: number, join: StrokeJoinType, limit: number, strategy: OffsetStrategy): PathType {
  let source: paper.Path;
  [source, offset] = preparePath(path, offset);
  const curves = source.curves.slice();
  const offsetCurves = curves.map((curve) => adaptiveOffsetCurve(curve, offset, strategy)).flat();
  const raws: paper.Segment[][] = [];
  for (let i = 0; i < offsetCurves.length; i += 2) {
    raws.push(offsetCurves.slice(i, i + 2));
  }
  const segments = connectBeziers(raws, join, source, offset, limit, strategy).flat();
  const newPath = removeIntersection(new paper.Path({ segments, insert: false, closed: path.closed }));
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

function makeRoundCap(from: paper.Segment, to: paper.Segment, offset: number) {
  const origin = from.point.add(to.point).divide(2);
  const normal = to.point.subtract(from.point).rotate(-90, new paper.Point(0, 0)).normalize(offset);
  const through = origin.add(normal);
  const arc = new paper.Path.Arc({ from: from.point, to: to.point, through, insert: false });
  return arc.segments;
}

function connectSide(outer: PathType, inner: paper.Path, offset: number, cap: StrokeCapType): paper.Path {
  if (outer instanceof paper.CompoundPath) {
    let cs = outer.children.map((c) => ({ c, a: Math.abs((c as paper.Path).area) }));
    cs = cs.sort((c1, c2) => c2.a - c1.a);
    outer = cs[0].c as paper.Path;
  }
  const oSegments = (outer as paper.Path).segments.slice();
  const iSegments = inner.segments.slice();
  switch (cap) {
    case 'round':
      const heads = makeRoundCap(iSegments[iSegments.length - 1], oSegments[0], offset);
      const tails = makeRoundCap(oSegments[oSegments.length - 1], iSegments[0], offset);
      const result = new paper.Path({ segments: heads.concat(oSegments, tails, iSegments), closed: true, insert: false });
      result.reduce({});
      return result;
    default: return new paper.Path({ segments: oSegments.concat(iSegments), closed: true, insert: false });
  }
}

function offsetSimpleStroke(path: paper.Path, offset: number, join: StrokeJoinType, cap: StrokeCapType, limit: number, strategy: OffsetStrategy): PathType {
  offset = path.closed && !path.clockwise ? -offset : offset;
  const positiveOffset = offsetSimpleShape(path, offset, join, limit, strategy);
  const negativeOffset = offsetSimpleShape(path, -offset, join, limit, strategy);
  if (path.closed) {
    return cleanupStrokeOutline(positiveOffset.subtract(negativeOffset, { insert: false }) as PathType, offset, strategy);
  } else {
    let inner = negativeOffset;
    let holes = new Array<paper.Path>();
    if (negativeOffset instanceof paper.CompoundPath) {
      holes = negativeOffset.children.filter((c) => (c as paper.Path).closed) as paper.Path[];
      holes.forEach((h) => h.remove());
      inner = negativeOffset.children[0] as paper.Path;
    }
    inner.reverse();
    let final = connectSide(positiveOffset, inner as paper.Path, offset, cap) as PathType;
    if (holes.length > 0) {
      for (const hole of holes) {
        final = final.subtract(hole, { insert: false }) as PathType;
      }
    }
    return cleanupStrokeOutline(final, offset, strategy);
  }
}

function getChildPaths(path: PathType): paper.Path[] {
  if (path instanceof paper.CompoundPath) {
    return path.children as paper.Path[];
  }
  return [path as paper.Path];
}

function finiteNumber(value: number) {
  return Number.isFinite(value);
}

function countSelfIntersections(path: PathType) {
  if (!path.closed) {
    return 0;
  }
  try {
    const children = getChildPaths(path);
    let count = 0;
    children.forEach((child, index) => {
      count += child.getIntersections(child).length;
      for (let i = index + 1; i < children.length; i += 1) {
        count += child.getIntersections(children[i]).length;
      }
    });
    return count;
  } catch (error) {
    return 0;
  }
}

function samplePoints(path: PathType, maxPerChild = 16) {
  const points: paper.Point[] = [];
  getChildPaths(path).forEach((child) => {
    if (!child.length || child.segments.length === 0) {
      return;
    }
    const count = Math.min(maxPerChild, Math.max(4, Math.ceil(child.length / 30)));
    for (let i = 0; i < count; i += 1) {
      const ratio = child.closed ? i / count : i / Math.max(count - 1, 1);
      const point = child.getPointAt(child.length * ratio);
      if (point) {
        points.push(point);
      }
    }
  });
  return points;
}

function containsPoint(path: PathType, point: paper.Point) {
  try {
    return path.contains(point);
  } catch (error) {
    return false;
  }
}

function distanceToPath(path: PathType, point: paper.Point) {
  try {
    const nearest = path.getNearestPoint(point);
    return nearest ? nearest.getDistance(point) : Number.POSITIVE_INFINITY;
  } catch (error) {
    return Number.POSITIVE_INFINITY;
  }
}

function addWarning(warnings: string[], warning: string) {
  if (warnings.indexOf(warning) === -1) {
    warnings.push(warning);
  }
}

export function analyzeOffsetQuality(source: PathType, result: PathType, offset: number, options: OffsetQualityOptions = {}): OffsetQuality {
  const warnings = new Array<string>();
  const expectedClosed = options.stroke ? true : source.closed;
  const segmentCount = getSegments(result).length;
  const area = Math.abs(result.area || 0);
  const absOffset = Math.abs(offset);
  let score = segmentCount * 0.01;
  let containmentErrors = 0;
  let distanceErrors = 0;
  const bounds = result.bounds;

  if (segmentCount === 0) {
    score += 100000;
    addWarning(warnings, 'empty-result');
  }

  if (!bounds || !finiteNumber(bounds.x) || !finiteNumber(bounds.y) || !finiteNumber(bounds.width) || !finiteNumber(bounds.height)) {
    score += 100000;
    addWarning(warnings, 'non-finite-bounds');
  }

  if (result.closed !== expectedClosed) {
    score += 50000;
    addWarning(warnings, 'unexpected-closed-state');
  }

  const selfIntersections = countSelfIntersections(result);
  if (selfIntersections > 0) {
    score += selfIntersections * 1000;
    addWarning(warnings, 'self-intersection');
  }

  if (source.closed && result.closed && !options.stroke) {
    const sourceArea = Math.abs(source.area || 0);
    if (sourceArea > 0 && offset > 0 && area < sourceArea * 0.95) {
      score += ((sourceArea - area) / sourceArea) * 2000;
      addWarning(warnings, 'positive-offset-area-shrank');
    }
    if (sourceArea > 0 && offset < 0 && area > sourceArea * 1.05) {
      score += ((area - sourceArea) / sourceArea) * 2000;
      addWarning(warnings, 'negative-offset-area-grew');
    }

    const containmentTolerance = Math.max(absOffset * 0.08, 0.5);
    const containmentSamples = offset >= 0 ? samplePoints(source) : samplePoints(result);
    containmentSamples.forEach((point) => {
      const container = offset >= 0 ? result : source;
      if (!containsPoint(container, point) && distanceToPath(container, point) > containmentTolerance) {
        containmentErrors += 1;
      }
    });
    if (containmentErrors > 0) {
      score += containmentErrors * 150;
      addWarning(warnings, offset >= 0 ? 'source-outside-positive-offset' : 'negative-offset-outside-source');
    }
  }

  if (absOffset > 0.001) {
    const distanceTolerance = Math.max(absOffset * 0.18, 0.75);
    samplePoints(result).forEach((point) => {
      const distance = distanceToPath(source, point);
      if (finiteNumber(distance) && distance < distanceTolerance) {
        distanceErrors += 1;
      }
    });
    if (distanceErrors > 0) {
      score += distanceErrors * 35;
      addWarning(warnings, 'offset-distance-collapse');
    }
  }

  return {
    score,
    warnings,
    selfIntersections,
    containmentErrors,
    distanceErrors,
    segmentCount,
    area,
  };
}

function pickBestResult(source: PathType, offset: number, stroke: boolean, makeResult: (strategy: OffsetStrategy) => PathType): PathType {
  let bestResult: PathType | null = null;
  let bestQuality: OffsetQuality | null = null;
  let firstError: Error | null = null;

  STRATEGIES.forEach((strategy) => {
    try {
      const result = makeResult(strategy);
      const quality = analyzeOffsetQuality(source, result, offset, { stroke });
      quality.algorithm = strategy.algorithm;
      if (!bestQuality || quality.score < bestQuality.score) {
        bestResult = result;
        bestQuality = quality;
      }
    } catch (error) {
      if (!firstError && error instanceof Error) {
        firstError = error;
      }
    }
  });

  if (!bestResult) {
    throw firstError || new Error('Unable to offset path with any algorithm');
  }

  return bestResult;
}

function getNonSelfIntersectionPath(path: PathType) {
  if (path.closed) {
    return path.unite(path, { insert: false }) as PathType;
  }
  return path;
}

function offsetPathWithStrategy(path: PathType, offset: number, join: StrokeJoinType, limit: number, strategy: OffsetStrategy): PathType {
  const nonSIPath = getNonSelfIntersectionPath(path);
  let result = nonSIPath;
  if (nonSIPath instanceof paper.Path) {
    result = offsetSimpleShape(nonSIPath, offset, join, limit, strategy);
  } else {
    const offsetParts = (nonSIPath.children as paper.Path[]).map((c) => {
      if (c.segments.length > 1) {
        if (!isSameDirection(c, path)) {
          c.reverse();
        }
        let offsetPath = offsetSimpleShape(c, offset, join, limit, strategy);
        offsetPath = normalize(offsetPath);
        if (offsetPath.clockwise !== c.clockwise) {
          offsetPath.reverse();
        }
        if (offsetPath instanceof paper.CompoundPath) {
          offsetPath.applyMatrix = true;
          return offsetPath.children;
        } else {
          return offsetPath;
        }
      } else {
        return null;
      }
    });
    const children = offsetParts.flat().filter((c) => !!c) as paper.Item[];
    result = new paper.CompoundPath({ children, insert: false });
  }
  result = normalize(result);
  result.copyAttributes(nonSIPath, false);
  result.remove();
  return result;
}

export function offsetPath(path: PathType, offset: number, join: StrokeJoinType, limit: number, algorithm: OffsetAlgorithm = 'auto'): PathType {
  if (algorithm === 'auto') {
    return pickBestResult(path, offset, false, (strategy) => offsetPathWithStrategy(path, offset, join, limit, strategy));
  }
  return offsetPathWithStrategy(path, offset, join, limit, getStrategy(algorithm));
}

function offsetStrokeWithStrategy(path: PathType, offset: number, join: StrokeJoinType, cap: StrokeCapType, limit: number, strategy: OffsetStrategy): PathType {
  const nonSIPath = getNonSelfIntersectionPath(path);
  let result = nonSIPath;
  if (nonSIPath instanceof paper.Path) {
    result = offsetSimpleStroke(nonSIPath, offset, join, cap, limit, strategy);
  } else {
    const children = (nonSIPath.children as paper.Path[]).flatMap((c) => {
      return offsetSimpleStroke(c, offset, join, cap, limit, strategy);
    });
    result = children.reduce((c1, c2) => c1.unite(c2, { insert: false }) as PathType);
  }
  result.strokeWidth = 0;
  result.fillColor = nonSIPath.strokeColor;
  result.shadowBlur = nonSIPath.shadowBlur;
  result.shadowColor = nonSIPath.shadowColor;
  result.shadowOffset = nonSIPath.shadowOffset;
  return result;
}

export function offsetStroke(path: PathType, offset: number, join: StrokeJoinType, cap: StrokeCapType, limit: number, algorithm: OffsetAlgorithm = 'auto'): PathType {
  if (algorithm === 'auto') {
    return pickBestResult(path, offset, true, (strategy) => offsetStrokeWithStrategy(path, offset, join, cap, limit, strategy));
  }
  return offsetStrokeWithStrategy(path, offset, join, cap, limit, getStrategy(algorithm));
}
