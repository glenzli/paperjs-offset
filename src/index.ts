import paper from 'paper'
import { OffsetPath, StrokeJoinType, PathType } from './Offset'

export interface OffsetOptions {
  mode?: StrokeJoinType,
  limit?: number,
  insert?: boolean,
}

declare module 'paper' {
  interface Path {
    offset(offset: number, options?: OffsetOptions): PathType
  }

  interface CompoundPath {
    offset(offset: number, options?: OffsetOptions): PathType
  }
}

function PrototypedOffset(path: PathType, offset: number, options?: OffsetOptions) {
  options = options || {}
  let offsetPath = OffsetPath(path, offset, options.mode || 'miter', options.limit || 10)
  if (options.insert === undefined) {
    options.insert = true
  }
  if (options.insert) {
    (path.parent || paper.project.activeLayer).addChild(offsetPath)
  }
  return offsetPath
}

export default function ExtendPaperJs() {
  paper.Path.prototype.offset = function(offset: number, options?: OffsetOptions) {
    return PrototypedOffset(this, offset, options)
  }

  paper.CompoundPath.prototype.offset = function(offset: number, options?: OffsetOptions) {
    return PrototypedOffset(this, offset, options)
  }
}
