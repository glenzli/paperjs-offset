import paper from 'paper';
import { StrokeJoinType, PathType, StrokeCapType, offsetPath, offsetStroke } from './offset_core';

export interface OffsetOptions {
  join?: StrokeJoinType;
  cap?: StrokeCapType;
  limit?: number;
  insert?: boolean;
}

export class PaperOffset {
  public static offset(path: PathType, offset: number, options?: OffsetOptions): PathType {
    options = options || {};
    const newPath = offsetPath(path, offset, options.join || 'miter', options.limit || 10);
    if (options.insert === undefined) {
      options.insert = true;
    }
    if (options.insert) {
      (path.parent || paper.project.activeLayer).addChild(newPath);
    }
    return newPath;
  }

  public static offsetStroke(path: PathType, offset: number, options?: OffsetOptions): PathType {
    options = options || {};
    const newPath = offsetStroke(path, offset, options.join || 'miter', options.cap || 'butt', options.limit || 10);
    if (options.insert === undefined) {
      options.insert = true;
    }
    if (options.insert) {
      (path.parent || paper.project.activeLayer).addChild(newPath);
    }
    return newPath;
  }
}

/**
 * @deprecated EXTEND existing paper module is not recommend anymore
 */
export default function ExtendPaperJs(paperNs: any) {
  paperNs.Path.prototype.offset = function(offset: number, options?: OffsetOptions) {
    return PaperOffset.offset(this, offset, options);
  };

  paperNs.Path.prototype.offsetStroke = function(offset: number, options?: OffsetOptions) {
    return PaperOffset.offsetStroke(this, offset, options);
  };

  paperNs.CompoundPath.prototype.offset = function(offset: number, options?: OffsetOptions) {
    return PaperOffset.offset(this, offset, options);
  };

  paperNs.CompoundPath.prototype.offsetStroke = function(offset: number, options?: OffsetOptions) {
    return PaperOffset.offsetStroke(this, offset, options);
  };
}
