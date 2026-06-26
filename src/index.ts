import paper from 'paper';
import { analyzeOffsetQuality, offsetPath as createOffsetPath, offsetStroke as createOffsetStroke } from './offset_core';
import type { StrokeJoinType, PathType, StrokeCapType, OffsetAlgorithm, OffsetQuality, OffsetQualityOptions } from './offset_core';

export type { OffsetAlgorithm, OffsetQuality, OffsetQualityOptions };

export interface OffsetOptions {
  join?: StrokeJoinType;
  cap?: StrokeCapType;
  limit?: number;
  insert?: boolean;
  algorithm?: OffsetAlgorithm;
}

function insertResult(source: PathType, result: PathType, options?: OffsetOptions) {
  if (!options || options.insert !== false) {
    (source.parent || paper.project.activeLayer).addChild(result);
  }
}

export function offset(path: PathType, distance: number, options?: OffsetOptions): PathType {
  const newPath = createOffsetPath(
    path,
    distance,
    options && options.join || 'miter',
    options && options.limit || 10,
    options && options.algorithm || 'auto'
  );
  insertResult(path, newPath, options);
  return newPath;
}

export function offsetStroke(path: PathType, distance: number, options?: OffsetOptions): PathType {
  const newPath = createOffsetStroke(
    path,
    distance,
    options && options.join || 'miter',
    options && options.cap || 'butt',
    options && options.limit || 10,
    options && options.algorithm || 'auto'
  );
  insertResult(path, newPath, options);
  return newPath;
}

export function analyze(source: PathType, result: PathType, distance: number, options?: OffsetQualityOptions): OffsetQuality {
  return analyzeOffsetQuality(source, result, distance, options || {});
}

export class PaperOffset {
  public static offset(path: PathType, distance: number, options?: OffsetOptions): PathType {
    return offset(path, distance, options);
  }

  public static offsetStroke(path: PathType, distance: number, options?: OffsetOptions): PathType {
    return offsetStroke(path, distance, options);
  }

  public static analyze(source: PathType, result: PathType, distance: number, options?: OffsetQualityOptions): OffsetQuality {
    return analyze(source, result, distance, options);
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

export { ExtendPaperJs as extendPaperJs };
