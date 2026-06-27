(function (paper) {
    'use strict';

    var MAX_RECURSION_TIME = 20;
    var STRATEGIES = [
        {
            algorithm: 'adaptive',
            splitSelfIntersectingCurves: true,
            guardInsideJoins: true,
            simplifySelfIntersectingStroke: true,
            adaptiveFallback: true,
        },
        {
            algorithm: 'robust',
            splitSelfIntersectingCurves: true,
            guardInsideJoins: true,
            simplifySelfIntersectingStroke: true,
            adaptiveFallback: false,
        },
        {
            algorithm: 'split',
            splitSelfIntersectingCurves: true,
            guardInsideJoins: false,
            simplifySelfIntersectingStroke: false,
            adaptiveFallback: false,
        },
        {
            algorithm: 'legacy',
            splitSelfIntersectingCurves: false,
            guardInsideJoins: false,
            simplifySelfIntersectingStroke: false,
            adaptiveFallback: false,
        },
    ];
    function getStrategy(algorithm) {
        if (algorithm === 'auto') {
            return STRATEGIES[0];
        }
        return STRATEGIES.filter(function (strategy) { return strategy.algorithm === algorithm; })[0] || STRATEGIES[0];
    }
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
    function adaptiveOffsetCurve(curve, offset, strategy, recursionTime) {
        if (recursionTime === void 0) { recursionTime = 0; }
        var hNormal = (new paper.Curve(curve.segment1.handleOut.add(curve.segment1.point), new paper.Point(0, 0), new paper.Point(0, 0), curve.segment2.handleIn.add(curve.segment2.point))).getNormalAtTime(0.5).multiply(offset);
        var segment1 = offsetSegment(curve.segment1, curve, hNormal, offset);
        var segment2 = offsetSegment(curve.segment2, curve, hNormal, offset);
        if (recursionTime > MAX_RECURSION_TIME) {
            return [segment1, segment2];
        }
        // divide && re-offset
        var offsetCurve = new paper.Curve(segment1, segment2);
        var offsetCurveIntersections = offsetCurve.getIntersections(offsetCurve);
        var threshold = Math.min(Math.abs(offset) / 10, 1);
        var midOffset = offsetCurve.getPointAtTime(0.5).getDistance(curve.getPointAtTime(0.5));
        var needsSplit = strategy.splitSelfIntersectingCurves
            ? offsetCurveIntersections.length > 0 || Math.abs(midOffset - Math.abs(offset)) > threshold
            : offsetCurveIntersections.length === 0 && Math.abs(midOffset - Math.abs(offset)) > threshold;
        if (needsSplit) {
            var subCurve = curve.divideAtTime(0.5);
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
    function isOutsideJoin(origin, offset) {
        var _a;
        var previousCurve = (_a = origin.previous) === null || _a === void 0 ? void 0 : _a.curve;
        var nextCurve = origin.curve;
        if (!previousCurve || !nextCurve) {
            return true;
        }
        var tangentIn = previousCurve.getTangentAtTime(1);
        var tangentOut = nextCurve.getTangentAtTime(0);
        var turn = det(tangentIn, tangentOut);
        return Math.abs(turn) < 1e-9 || turn * offset > 0;
    }
    function connectAdjacentBezier(segments1, segments2, origin, joinType, offset, limit, closed, strategy) {
        var curve1 = new paper.Curve(segments1[0], segments1[1]);
        var curve2 = new paper.Curve(segments2[0], segments2[1]);
        var intersection = curve1.getIntersections(curve2);
        var distance = segments1[1].point.getDistance(segments2[0].point);
        var shouldJoin = !closed || !strategy.guardInsideJoins || isOutsideJoin(origin, offset);
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
                            if (shouldJoin) {
                                var join = getPointLineIntersections(curve1.point2, curve1.point2.add(curve1.getTangentAtTime(1)), curve2.point1, curve2.point1.add(curve2.getTangentAtTime(0)));
                                // prevent sharp angle
                                var joinOffset = Math.max(join.getDistance(curve1.point2), join.getDistance(curve2.point1));
                                if (joinOffset < Math.abs(offset) * limit) {
                                    segments1.push(new paper.Segment(join));
                                }
                            }
                            break;
                        case 'round':
                            if (shouldJoin) {
                                var mid = makeRoundJoin(segments1[1], segments2[0], origin.point, offset);
                                if (mid) {
                                    segments1.push(mid);
                                }
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
    function connectBeziers(rawSegments, join, source, offset, limit, strategy) {
        var originSegments = source.segments;
        var first = rawSegments[0].slice();
        for (var i = 0; i < rawSegments.length - 1; ++i) {
            connectAdjacentBezier(rawSegments[i], rawSegments[i + 1], originSegments[i + 1], join, offset, limit, source.closed, strategy);
        }
        if (source.closed) {
            connectAdjacentBezier(rawSegments[rawSegments.length - 1], first, originSegments[0], join, offset, limit, source.closed, strategy);
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
            path = path.resolveCrossings();
            if (path instanceof paper.CompoundPath) {
                path.children.filter(function (c) { return Math.abs(c.area) < ignoreArea_1; }).forEach(function (c) { return c.remove(); });
                if (path.children.length === 1) {
                    return reduceSingleChildCompoundPath(path);
                }
            }
        }
        return path;
    }
    function cleanupStrokeOutline(path, offset, strategy) {
        var result = normalize(path);
        if (strategy.simplifySelfIntersectingStroke && countSelfIntersections(result) > 0) {
            var simplified = result.clone({ insert: false });
            simplified.simplify(Math.max(Math.min(Math.abs(offset) * 0.02, 0.5), 0.1));
            result = normalize(simplified);
        }
        return result;
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
        if (path.closed && !path.clockwise) {
            source.reverse();
            offset = -offset;
        }
        return [source, offset];
    }
    function offsetSimpleShape(path, offset, join, limit, strategy) {
        var _a;
        var source;
        _a = preparePath(path, offset), source = _a[0], offset = _a[1];
        var curves = source.curves.slice();
        var offsetCurves = curves.map(function (curve) { return adaptiveOffsetCurve(curve, offset, strategy); }).flat();
        var raws = [];
        for (var i = 0; i < offsetCurves.length; i += 2) {
            raws.push(offsetCurves.slice(i, i + 2));
        }
        var segments = connectBeziers(raws, join, source, offset, limit, strategy).flat();
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
    function offsetSimpleStroke(path, offset, join, cap, limit, strategy) {
        offset = path.closed && !path.clockwise ? -offset : offset;
        var positiveOffset = offsetSimpleShape(path, offset, join, limit, strategy);
        var negativeOffset = offsetSimpleShape(path, -offset, join, limit, strategy);
        if (path.closed) {
            return cleanupStrokeOutline(positiveOffset.subtract(negativeOffset, { insert: false }), offset, strategy);
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
            return cleanupStrokeOutline(final, offset, strategy);
        }
    }
    function getChildPaths(path) {
        if (path instanceof paper.CompoundPath) {
            return path.children;
        }
        return [path];
    }
    function finiteNumber(value) {
        return Number.isFinite(value);
    }
    function countSelfIntersections(path) {
        if (!path.closed) {
            return 0;
        }
        try {
            var children_1 = getChildPaths(path);
            var count_1 = 0;
            children_1.forEach(function (child, index) {
                count_1 += child.getIntersections(child).length;
                for (var i = index + 1; i < children_1.length; i += 1) {
                    count_1 += child.getIntersections(children_1[i]).length;
                }
            });
            return count_1;
        }
        catch (error) {
            return 0;
        }
    }
    function samplePoints(path, maxPerChild) {
        if (maxPerChild === void 0) { maxPerChild = 16; }
        var points = [];
        getChildPaths(path).forEach(function (child) {
            if (!child.length || child.segments.length === 0) {
                return;
            }
            var count = Math.min(maxPerChild, Math.max(4, Math.ceil(child.length / 30)));
            for (var i = 0; i < count; i += 1) {
                var ratio = child.closed ? i / count : i / Math.max(count - 1, 1);
                var point = child.getPointAt(child.length * ratio);
                if (point) {
                    points.push(point);
                }
            }
        });
        return points;
    }
    function containsPoint(path, point) {
        try {
            return path.contains(point);
        }
        catch (error) {
            return false;
        }
    }
    function distanceToPath(path, point) {
        try {
            var nearest = path.getNearestPoint(point);
            return nearest ? nearest.getDistance(point) : Number.POSITIVE_INFINITY;
        }
        catch (error) {
            return Number.POSITIVE_INFINITY;
        }
    }
    function addWarning(warnings, warning) {
        if (warnings.indexOf(warning) === -1) {
            warnings.push(warning);
        }
    }
    function analyzeOffsetQuality(source, result, offset, options) {
        if (options === void 0) { options = {}; }
        var warnings = new Array();
        var expectedClosed = options.stroke ? true : source.closed;
        var segmentCount = getSegments(result).length;
        var area = Math.abs(result.area || 0);
        var absOffset = Math.abs(offset);
        var score = segmentCount * 0.01;
        var containmentErrors = 0;
        var distanceErrors = 0;
        var bounds = result.bounds;
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
        var selfIntersections = countSelfIntersections(result);
        if (selfIntersections > 0) {
            score += selfIntersections * 1000;
            addWarning(warnings, 'self-intersection');
        }
        if (source.closed && result.closed && !options.stroke) {
            var sourceArea = Math.abs(source.area || 0);
            if (sourceArea > 0 && offset > 0 && area < sourceArea * 0.95) {
                score += ((sourceArea - area) / sourceArea) * 2000;
                addWarning(warnings, 'positive-offset-area-shrank');
            }
            if (sourceArea > 0 && offset < 0 && area > sourceArea * 1.05) {
                score += ((area - sourceArea) / sourceArea) * 2000;
                addWarning(warnings, 'negative-offset-area-grew');
            }
            if (sourceArea > 0 && offset < 0) {
                var areaRatio = area / sourceArea;
                if (areaRatio < 0.25) {
                    score += (0.25 - areaRatio) * 4000;
                    addWarning(warnings, 'negative-offset-collapse');
                }
            }
            if (sourceArea > 0 && offset > 0) {
                var sourceBounds = source.bounds;
                var centerShift = result.bounds.center.getDistance(sourceBounds.center);
                var centerTolerance = Math.max(absOffset * 1.15, Math.min(sourceBounds.width, sourceBounds.height) * 0.08);
                if (centerShift > centerTolerance) {
                    score += (centerShift - centerTolerance) * 80;
                    addWarning(warnings, 'offset-center-shift');
                }
            }
            var containmentTolerance_1 = Math.max(absOffset * 0.08, 0.5);
            var containmentSamples = offset >= 0 ? samplePoints(source) : samplePoints(result);
            containmentSamples.forEach(function (point) {
                var container = offset >= 0 ? result : source;
                if (!containsPoint(container, point) && distanceToPath(container, point) > containmentTolerance_1) {
                    containmentErrors += 1;
                }
            });
            if (containmentErrors > 0) {
                score += containmentErrors * 150;
                addWarning(warnings, offset >= 0 ? 'source-outside-positive-offset' : 'negative-offset-outside-source');
            }
        }
        if (absOffset > 0.001) {
            var distanceTolerance_1 = Math.max(absOffset * 0.18, 0.75);
            samplePoints(result).forEach(function (point) {
                var distance = distanceToPath(source, point);
                if (finiteNumber(distance) && distance < distanceTolerance_1) {
                    distanceErrors += 1;
                }
            });
            if (distanceErrors > 0) {
                score += distanceErrors * 35;
                addWarning(warnings, 'offset-distance-collapse');
            }
        }
        return {
            score: score,
            warnings: warnings,
            selfIntersections: selfIntersections,
            containmentErrors: containmentErrors,
            distanceErrors: distanceErrors,
            segmentCount: segmentCount,
            area: area,
        };
    }
    function pickBestResult(source, offset, stroke, makeResult) {
        var bestResult = null;
        var bestQuality = null;
        var firstError = null;
        STRATEGIES.forEach(function (strategy) {
            try {
                var result = makeResult(strategy);
                var quality = analyzeOffsetQuality(source, result, offset, { stroke: stroke });
                quality.algorithm = strategy.algorithm;
                if (!bestQuality || quality.score < bestQuality.score) {
                    bestResult = result;
                    bestQuality = quality;
                }
            }
            catch (error) {
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
    function getNonSelfIntersectionPath(path) {
        if (path.closed) {
            return path.unite(path, { insert: false });
        }
        return path;
    }
    function withoutAdaptiveFallback(strategy) {
        return {
            algorithm: 'robust',
            splitSelfIntersectingCurves: strategy.splitSelfIntersectingCurves,
            guardInsideJoins: strategy.guardInsideJoins,
            simplifySelfIntersectingStroke: strategy.simplifySelfIntersectingStroke,
            adaptiveFallback: false,
        };
    }
    function addAdaptiveCandidate(candidates, makeResult) {
        try {
            candidates.push(makeResult());
        }
        catch (error) {
            // Keep adaptive mode opportunistic: a failed fallback should not hide valid strict results.
        }
    }
    function pickBestCandidate(source, offset, stroke, candidates) {
        var bestResult = candidates[0];
        var bestQuality = analyzeOffsetQuality(source, bestResult, offset, { stroke: stroke });
        for (var i = 1; i < candidates.length; i += 1) {
            var quality = analyzeOffsetQuality(source, candidates[i], offset, { stroke: stroke });
            if (quality.score < bestQuality.score) {
                bestResult = candidates[i];
                bestQuality = quality;
            }
        }
        return bestResult;
    }
    function offsetPathAdaptive(path, offset, join, limit, strategy) {
        var baseStrategy = withoutAdaptiveFallback(strategy);
        var candidates = new Array();
        addAdaptiveCandidate(candidates, function () { return offsetPathWithStrategy(path, offset, join, limit, baseStrategy); });
        if (join !== 'round') {
            addAdaptiveCandidate(candidates, function () { return offsetPathWithStrategy(path, offset, 'round', limit, baseStrategy); });
        }
        if (path.closed && offset < 0) {
            [0.8, 0.65, 0.5, 0.35, 0.25].forEach(function (factor) {
                var fallbackOffset = offset * factor;
                addAdaptiveCandidate(candidates, function () { return offsetPathWithStrategy(path, fallbackOffset, join, limit, baseStrategy); });
                if (join !== 'round') {
                    addAdaptiveCandidate(candidates, function () { return offsetPathWithStrategy(path, fallbackOffset, 'round', limit, baseStrategy); });
                }
            });
        }
        if (candidates.length === 0) {
            return offsetPathWithStrategy(path, offset, join, limit, baseStrategy);
        }
        return pickBestCandidate(path, offset, false, candidates);
    }
    function offsetPathWithStrategy(path, offset, join, limit, strategy) {
        if (strategy.adaptiveFallback) {
            return offsetPathAdaptive(path, offset, join, limit, strategy);
        }
        var nonSIPath = getNonSelfIntersectionPath(path);
        var result = nonSIPath;
        if (nonSIPath instanceof paper.Path) {
            result = offsetSimpleShape(nonSIPath, offset, join, limit, strategy);
        }
        else {
            var offsetParts = nonSIPath.children.map(function (c) {
                if (c.segments.length > 1) {
                    if (!isSameDirection(c, path)) {
                        c.reverse();
                    }
                    var offsetPath_1 = offsetSimpleShape(c, offset, join, limit, strategy);
                    offsetPath_1 = normalize(offsetPath_1);
                    if (offsetPath_1.clockwise !== c.clockwise) {
                        offsetPath_1.reverse();
                    }
                    if (offsetPath_1 instanceof paper.CompoundPath) {
                        offsetPath_1.applyMatrix = true;
                        return offsetPath_1.children;
                    }
                    else {
                        return offsetPath_1;
                    }
                }
                else {
                    return null;
                }
            });
            var children = offsetParts.flat().filter(function (c) { return !!c; });
            result = new paper.CompoundPath({ children: children, insert: false });
        }
        result = normalize(result);
        result.copyAttributes(nonSIPath, false);
        result.remove();
        return result;
    }
    function offsetPath(path, offset, join, limit, algorithm) {
        if (algorithm === void 0) { algorithm = 'auto'; }
        if (algorithm === 'auto') {
            return pickBestResult(path, offset, false, function (strategy) { return offsetPathWithStrategy(path, offset, join, limit, strategy); });
        }
        return offsetPathWithStrategy(path, offset, join, limit, getStrategy(algorithm));
    }
    function offsetStrokeWithStrategy(path, offset, join, cap, limit, strategy) {
        if (strategy.adaptiveFallback) {
            return offsetStrokeAdaptive(path, offset, join, cap, limit, strategy);
        }
        var nonSIPath = getNonSelfIntersectionPath(path);
        var result = nonSIPath;
        if (nonSIPath instanceof paper.Path) {
            result = offsetSimpleStroke(nonSIPath, offset, join, cap, limit, strategy);
        }
        else {
            var children = nonSIPath.children.flatMap(function (c) {
                return offsetSimpleStroke(c, offset, join, cap, limit, strategy);
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
    function offsetStrokeAdaptive(path, offset, join, cap, limit, strategy) {
        var baseStrategy = withoutAdaptiveFallback(strategy);
        var candidates = new Array();
        addAdaptiveCandidate(candidates, function () { return offsetStrokeWithStrategy(path, offset, join, cap, limit, baseStrategy); });
        if (join !== 'round') {
            addAdaptiveCandidate(candidates, function () { return offsetStrokeWithStrategy(path, offset, 'round', cap, limit, baseStrategy); });
        }
        if (cap !== 'round') {
            addAdaptiveCandidate(candidates, function () { return offsetStrokeWithStrategy(path, offset, join, 'round', limit, baseStrategy); });
        }
        if (join !== 'round' && cap !== 'round') {
            addAdaptiveCandidate(candidates, function () { return offsetStrokeWithStrategy(path, offset, 'round', 'round', limit, baseStrategy); });
        }
        if (candidates.length === 0) {
            return offsetStrokeWithStrategy(path, offset, join, cap, limit, baseStrategy);
        }
        return pickBestCandidate(path, offset, true, candidates);
    }
    function offsetStroke$1(path, offset, join, cap, limit, algorithm) {
        if (algorithm === void 0) { algorithm = 'auto'; }
        if (algorithm === 'auto') {
            return pickBestResult(path, offset, true, function (strategy) { return offsetStrokeWithStrategy(path, offset, join, cap, limit, strategy); });
        }
        return offsetStrokeWithStrategy(path, offset, join, cap, limit, getStrategy(algorithm));
    }

    function resolveOptions(options) {
        var _a, _b, _c, _d;
        return {
            join: (_a = options === null || options === void 0 ? void 0 : options.join) !== null && _a !== void 0 ? _a : 'miter',
            cap: (_b = options === null || options === void 0 ? void 0 : options.cap) !== null && _b !== void 0 ? _b : 'butt',
            limit: (_c = options === null || options === void 0 ? void 0 : options.limit) !== null && _c !== void 0 ? _c : 10,
            algorithm: (_d = options === null || options === void 0 ? void 0 : options.algorithm) !== null && _d !== void 0 ? _d : 'auto',
        };
    }
    function insertResult(source, result, options) {
        if (!options || options.insert !== false) {
            (source.parent || paper.project.activeLayer).addChild(result);
        }
    }
    function offset(path, distance, options) {
        var resolvedOptions = resolveOptions(options);
        var newPath = offsetPath(path, distance, resolvedOptions.join, resolvedOptions.limit, resolvedOptions.algorithm);
        insertResult(path, newPath, options);
        return newPath;
    }
    function offsetStroke(path, distance, options) {
        var resolvedOptions = resolveOptions(options);
        var newPath = offsetStroke$1(path, distance, resolvedOptions.join, resolvedOptions.cap, resolvedOptions.limit, resolvedOptions.algorithm);
        insertResult(path, newPath, options);
        return newPath;
    }
    function analyze(source, result, distance, options) {
        return analyzeOffsetQuality(source, result, distance, options || {});
    }
    /**
     * @deprecated EXTEND existing paper module is not recommend anymore
     */
    function ExtendPaperJs(paperNs) {
        paperNs.Path.prototype.offset = function (distance, options) {
            return offset(this, distance, options);
        };
        paperNs.Path.prototype.offsetStroke = function (distance, options) {
            return offsetStroke(this, distance, options);
        };
        paperNs.CompoundPath.prototype.offset = function (distance, options) {
            return offset(this, distance, options);
        };
        paperNs.CompoundPath.prototype.offsetStroke = function (distance, options) {
            return offsetStroke(this, distance, options);
        };
    }

    ExtendPaperJs(paper);
    var api = {
        offset: offset,
        offsetStroke: offsetStroke,
        analyze: analyze,
    };
    window.PaperOffset = api;
    window.paperjsOffset = api;

})(paper);
