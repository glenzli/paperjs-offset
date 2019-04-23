import paper from 'paper'
import { OffsetPath, StrokeJoinType, PathType, StrokeCapType, OffsetStroke } from './Offset'

export interface OffsetOptions {
  join?: StrokeJoinType,
  cap?: StrokeCapType,
  limit?: number,
  insert?: boolean,
}

declare module 'paper' {
  interface Path {
    offset(offset: number, options?: OffsetOptions): PathType
    offsetStroke(offset: number, options?: OffsetOptions): PathType | paper.Group
  }

  interface CompoundPath {
    offset(offset: number, options?: OffsetOptions): PathType
    offsetStroke(offset: number, options?: OffsetOptions): PathType | paper.Group
  }
}

function PrototypedOffset(path: PathType, offset: number, options?: OffsetOptions) {
  options = options || {}
  let offsetPath = OffsetPath(path, offset, options.join || 'miter', options.limit || 10)
  if (options.insert === undefined) {
    options.insert = true
  }
  if (options.insert) {
    (path.parent || paper.project.activeLayer).addChild(offsetPath)
  }
  return offsetPath
}

function PrototypedOffsetStroke(path: PathType, offset: number, options?: OffsetOptions) {
  options = options || {}
  let offsetPath = OffsetStroke(path, offset, options.join || 'miter', options.cap || 'butt', options.limit || 10)
  if (options.insert === undefined) {
    options.insert = true
  }
  if (options.insert) {
    (path.parent || paper.project.activeLayer).addChild(offsetPath)
  }
  return offsetPath
}

export default function ExtendPaperJs(paper: any) {
  paper.Path.prototype.offset = function(offset: number, options?: OffsetOptions) {
    return PrototypedOffset(this, offset, options)
  }

  paper.Path.prototype.offsetStroke = function (offset: number, options?: OffsetOptions) {
    return PrototypedOffsetStroke(this, offset, options)
  }

  paper.CompoundPath.prototype.offset = function(offset: number, options?: OffsetOptions) {
    return PrototypedOffset(this, offset, options)
  }

  paper.CompoundPath.prototype.offsetStroke = function (offset: number, options?: OffsetOptions) {
    return PrototypedOffsetStroke(this, offset, options)
  }
}
