import paper, { Point } from 'paper'
import { Arrayex } from 'arrayex'

type HandleType = 'handleIn' | 'handleOut'
export type StrokeJoinType = 'miter' | 'bevel' | 'round'
export type StrokeCapType = 'round' | 'butt'
export type PathType = paper.Path | paper.CompoundPath

namespace Offsets {
  /**
   * Offset the start/terminal segment of a bezier curve
   * @param segment segment to offset
   * @param curve curve to offset
   * @param handleNormal the normal of the the line formed of two handles
   * @param offset offset value
   */
  function OffsetSegment(segment: paper.Segment, curve: paper.Curve, handleNormal: paper.Point, offset: number) {
    let isFirst = segment.curve === curve
    // get offset vector
    let offsetVector = (curve.getNormalAt(isFirst ? 0 : 1, true)).multiply(offset)
    // get offset point
    let point = segment.point.add(offsetVector)
    let newSegment = new paper.Segment(point)
    // handleOut for start segment & handleIn for terminal segment
    let handle = (isFirst ? 'handleOut' : 'handleIn') as HandleType
    newSegment[handle] = segment[handle]!.add(handleNormal.subtract(offsetVector).divide(2))
    return newSegment
  }

  /**
   * Adaptive offset a curve by repeatly apply the approximation proposed by Tiller and Hanson.
   * @param curve curve to offset
   * @param offset offset value
   */
  function AdaptiveOffsetCurve(curve: paper.Curve, offset: number): Array<paper.Segment> {
    offset
    let hNormal = (new paper.Curve(curve.segment1.handleOut!.add(curve.segment1.point), new paper.Point(0, 0), new paper.Point(0, 0), curve.segment2.handleIn!.add(curve.segment2.point))).getNormalAt(0.5, true).multiply(offset)
    let segment1 = OffsetSegment(curve.segment1, curve, hNormal, offset)
    let segment2 = OffsetSegment(curve.segment2, curve, hNormal, offset)
    // divide && re-offset
    let offsetCurve = new paper.Curve(segment1, segment2)
    // if the offset curve is not self intersected, divide it
    if (offsetCurve.getIntersections(offsetCurve).length === 0) {
      let threshold = Math.min(Math.abs(offset) / 10, 1)
      let midOffset = offsetCurve.getPointAt(0.5, true).getDistance(curve.getPointAt(0.5, true))
      if (Math.abs(midOffset - Math.abs(offset)) > threshold) {
        let subCurve = curve.divideAtTime(0.5)
        if (subCurve != null) {
          return [...AdaptiveOffsetCurve(curve, offset), ...AdaptiveOffsetCurve(subCurve, offset)]
        }
      }
    }
    return [segment1, segment2]
  }

  /**
   * Create a round join segment between two adjacent segments.
   */
  function MakeRoundJoin(segment1: paper.Segment, segment2: paper.Segment, originPoint: paper.Point, radius: number) {
    let through = segment1.point.subtract(originPoint).add(segment2.point.subtract(originPoint)).normalize(Math.abs(radius)).add(originPoint)
    let arc = new paper.Path.Arc({ from: segment1.point, to: segment2.point, through, insert: false })
    segment1.handleOut = arc.firstSegment.handleOut
    segment2.handleIn = arc.lastSegment.handleIn
    return arc.segments.length === 3 ? arc.segments[1] : null
  }

  function Det(p1: paper.Point, p2: paper.Point) {
    return p1.x * p2.y - p1.y * p2.x
  }

  /**
   * Get the intersection point of two point
   */
  function Intersection(p1: paper.Point, p2: paper.Point, p3: paper.Point, p4: paper.Point) {
    let l1 = p1.subtract(p2)
    let l2 = p3.subtract(p4)
    let dl1 = Det(p1, p2)
    let dl2 = Det(p3, p4)
    return new paper.Point(dl1 * l2.x - l1.x * dl2, dl1 * l2.y - l1.y * dl2).divide(Det(l1, l2))
  }

  /**
   * Connect two adjacent bezier curve, each curve is represented by two segments, create different types of joins or simply removal redundant segment.
   */
  export function ConnectAdjacentBezier(segments1: Array<paper.Segment>, segments2: Array<paper.Segment>, origin: paper.Segment, join: StrokeJoinType, offset: number, limit: number) {
    let curve1 = new paper.Curve(segments1[0], segments1[1])
    let curve2 = new paper.Curve(segments2[0], segments2[1])
    let intersection = curve1.getIntersections(curve2)
    let distance = segments1[1].point.getDistance(segments2[0].point)
    if (origin.isSmooth()) {
      segments2[0].handleOut = segments2[0].handleOut!.project(origin.handleOut!)
      segments2[0].handleIn = segments1[1].handleIn!.project(origin.handleIn!)
      segments2[0].point = segments1[1].point.add(segments2[0].point).divide(2)
      segments1.pop()
    } else {
      if (intersection.length === 0) {
        if (distance > Math.abs(offset) * 0.1) {
          // connect
          switch (join) {
            case 'miter':
              let join = Intersection(curve1.point2, curve1.point2.add(curve1.getTangentAt(1, true)), curve2.point1, curve2.point1.add(curve2.getTangentAt(0, true)))
              // prevent sharp angle
              let joinOffset = Math.max(join.getDistance(curve1.point2), join.getDistance(curve2.point1))
              if (joinOffset < Math.abs(offset) * limit) {
                segments1.push(new paper.Segment(join))
              }
              break
            case 'round':
              let mid = MakeRoundJoin(segments1[1], segments2[0], origin.point, offset)
              if (mid) {
                segments1.push(mid)
              }
              break
            default: break
          }
        } else {
          segments2[0].handleIn = segments1[1].handleIn
          segments1.pop()
        }
      } else {
        let second1 = curve1.divideAt(intersection[0])
        if (second1) {
          let join = second1.segment1
          let second2 = curve2.divideAt(curve2.getIntersections(curve1)[0])
          join.handleOut = second2 ? second2.segment1.handleOut : segments2[0].handleOut
          segments1.pop()
          segments2[0] = join
        } else {
          segments2[0].handleIn = segments1[1].handleIn
          segments1.pop()
        }
      }
    }
  }

  /**
   * Connect all the segments together.
   */
  function ConnectBeziers(rawSegments: Array<Array<paper.Segment>>, join: StrokeJoinType, source: paper.Path, offset: number, limit: number) {
    let originSegments = source.segments
    let first = rawSegments[0].slice()
    for (let i = 0; i < rawSegments.length - 1; ++i) {
      ConnectAdjacentBezier(rawSegments[i], rawSegments[i + 1], originSegments[i + 1], join, offset, limit)
    }
    if (source.closed) {
      ConnectAdjacentBezier(rawSegments[rawSegments.length - 1], first, originSegments[0], join, offset, limit)
      rawSegments[0][0] = first[0]
    }
    return rawSegments
  }

  function Decompound(path: PathType) {
    if (path.children.length === 1) {
      path = path.children[0] as paper.Path
      path.remove() // remove from parent, this is critical, or the style attributes will be ignored
    }
    return path
  }

  /** Normalize a path, always clockwise, non-self-intersection, ignore really small components, and no one-component compound path. */
  export function Normalize(path: PathType, areaThreshold = 0.01) {
    if (path.closed) {
      let ignoreArea = Math.abs(path.area * areaThreshold)
      if (!path.clockwise) {
        path.reverse()
      }
      path = path.unite(path, { insert: false }) as PathType
      if (path instanceof paper.CompoundPath) {
        path.children.filter(c => Math.abs((c as PathType).area) < ignoreArea).forEach(c => c.remove())
        if (path.children.length === 1) {
          return Decompound(path)
        }
      }
    }
    return path
  }

  /** Remove self intersection when offset is negative by point direction dectection. */
  export function RemoveIntersection(path: PathType) {
    let newPath = path.unite(path, { insert: false }) as PathType
    if (newPath instanceof paper.CompoundPath) {
      (newPath.children as Array<paper.Path>).filter(c => {
        if (c.segments.length > 1) {
          let sample1 = c.segments[0].location.offset
          let sample2 = c.segments[Math.max(1, Math.floor(c.segments.length / 2))].location.offset
          let offset1 = path.getNearestLocation(c.getPointAt((sample1 + sample2) / 3)).offset
          let offset2 = path.getNearestLocation(c.getPointAt((sample1 + sample2) / 3 * 2)).offset
          return offset1 > offset2
        } else {
          return true
        }
      }).forEach(c => c.remove())
      return Decompound(newPath)
    }
    return path
  }

  function Segments(path: PathType) {
    if (path instanceof paper.CompoundPath) {
      return Arrayex.Flat<paper.Segment>(path.children.map(c => (c as paper.Path).segments))
    } else {
      return (path as paper.Path).segments
    }
  }

  /**
   * Remove impossible segments in negative offset condition.
   */
  function RemoveOutsiders(offsetPath: PathType, path: PathType) {
    let segments = Segments(offsetPath).slice()
    segments.forEach(segment => {
      if (!path.contains(segment.point)) {
        segment.remove()
      }
    })
  }

  function PreparePath(path: paper.Path, offset: number): [paper.Path, number] {
    let source = path.clone({ insert: false }) as paper.Path
    source.reduce()
    if (!path.clockwise) {
      source.reverse()
      offset = -offset
    }
    return [source, offset]
  }

  export function OffsetSimpleShape(path: paper.Path, offset: number, join: StrokeJoinType, limit: number): PathType {
    let source: paper.Path
    [source, offset] = PreparePath(path, offset)
    let curves = source.curves.slice()
    let raws = Arrayex.Divide(Arrayex.Flat<paper.Segment>(curves.map(curve => AdaptiveOffsetCurve(curve, offset))), 2)
    let segments = Arrayex.Flat(ConnectBeziers(raws, join, source, offset, limit))
    let offsetPath = RemoveIntersection(new paper.Path({ segments, closed: path.closed }))
    offsetPath.reduce()
    if (source.closed && ((source.clockwise && offset < 0) || (!source.clockwise && offset > 0))) {
      RemoveOutsiders(offsetPath, path)
    }
    // recovery path
    if (source.clockwise !== path.clockwise) {
      offsetPath.reverse()
    }
    return Normalize(offsetPath)
  }

  function MakeRoundCap(from: paper.Segment, to: paper.Segment, offset: number) {
    let origin = from.point.add(to.point).divide(2)
    let normal = to.point.subtract(from.point).rotate(-90).normalize(offset)
    let through = origin.add(normal)
    let arc = new paper.Path.Arc({ from: from.point, to: to.point, through, insert: false })
    return arc.segments
  }

  function ConnectSide(outer: PathType, inner: paper.Path, offset: number, cap: StrokeCapType): paper.Path {
    if (outer instanceof paper.CompoundPath) {
      let cs = outer.children.map(c => ({ c, a: Math.abs((c as paper.Path).area) }))
      cs = cs.sort((c1, c2) => c2.a - c1.a)
      outer = cs[0].c as paper.Path
    }
    let oSegments = (outer as paper.Path).segments.slice()
    let iSegments = inner.segments.slice()
    switch (cap) {
      case 'round':
        let heads = MakeRoundCap(iSegments[iSegments.length - 1], oSegments[0], offset)
        let tails = MakeRoundCap(oSegments[oSegments.length - 1], iSegments[0], offset)
        let result = new paper.Path({ segments: [...heads, ...oSegments, ...tails, ...iSegments], closed: true, insert: false })
        result.reduce()
        return result
      default: return new paper.Path({ segments: [...oSegments, ...iSegments], closed: true, insert: false })
    }
  }

  export function OffsetSimpleStroke(path: paper.Path, offset: number, join: StrokeJoinType, cap: StrokeCapType, limit: number): PathType {
    offset = path.clockwise ? offset : -offset
    let positiveOffset = OffsetSimpleShape(path, offset, join, limit)
    let negativeOffset = OffsetSimpleShape(path, -offset, join, limit)
    if (path.closed) {
      return positiveOffset.subtract(negativeOffset, { insert: false }) as PathType
    } else {
      let inner = negativeOffset
      let holes = new Array<paper.Path>()
      if (negativeOffset instanceof paper.CompoundPath) {
        holes = negativeOffset.children.filter(c => (c as paper.Path).closed) as Array<paper.Path>
        holes.forEach(h => h.remove())
        inner = negativeOffset.children[0] as paper.Path
      }
      inner.reverse()
      let final = ConnectSide(positiveOffset, inner as paper.Path, offset, cap) as PathType
      if (holes.length > 0) {
        for(let hole of holes) {
          final = final.subtract(hole, { insert: false }) as PathType
        }
      }
      return final
    }
  }
}

export function OffsetPath(path: PathType, offset: number, join: StrokeJoinType, limit: number) {
  let result = path
  if (path instanceof paper.Path) {
    result = Offsets.OffsetSimpleShape(path, offset, join, limit)
  } else {
    let children = Arrayex.Flat((path.children as Array<paper.Path>).map(c => {
      let offseted = Offsets.OffsetSimpleShape(c, offset, join, limit)
      offseted = Offsets.Normalize(offseted)
      if (offseted.clockwise !== c.clockwise) {
        offseted.reverse()
      }
      if (offseted instanceof paper.CompoundPath) {
        offseted.applyMatrix = true
        return offseted.children
      } else {
        return offseted
      }
    }))
    result = new paper.CompoundPath({ children, closed: path.closed })
  }
  result.copyAttributes(path, false)
  return result
}

export function OffsetStroke(path: PathType, offset: number, join: StrokeJoinType, cap: StrokeCapType, limit: number) {
  let result = path as PathType | paper.Group
  if (path instanceof paper.Path) {
    result = Offsets.OffsetSimpleStroke(path, offset, join, cap, limit)
  } else {
    let children = Arrayex.Flat((path.children as Array<paper.Path>).map(c => {
      return Offsets.OffsetSimpleStroke(c, offset, join, cap, limit)
    }))
    result = new paper.Group({ children, insert: false })
  }
  result.strokeWidth = 0
  result.fillColor = path.strokeColor
  result.shadowBlur = path.shadowBlur
  result.shadowColor = path.shadowColor
  result.shadowOffset = path.shadowOffset
  return result
}
