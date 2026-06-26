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

interface ResolvedOffsetOptions {
  join: StrokeJoinType;
  cap: StrokeCapType;
  limit: number;
  algorithm: OffsetAlgorithm;
}

function resolveOptions(options?: OffsetOptions): ResolvedOffsetOptions {
  return {
    join: options?.join ?? 'miter',
    cap: options?.cap ?? 'butt',
    limit: options?.limit ?? 10,
    algorithm: options?.algorithm ?? 'auto',
  };
}

function insertResult(source: PathType, result: PathType, options?: OffsetOptions) {
  if (!options || options.insert !== false) {
    (source.parent || paper.project.activeLayer).addChild(result);
  }
}

export function offset(path: PathType, distance: number, options?: OffsetOptions): PathType {
  const resolvedOptions = resolveOptions(options);
  const newPath = createOffsetPath(
    path,
    distance,
    resolvedOptions.join,
    resolvedOptions.limit,
    resolvedOptions.algorithm
  );
  insertResult(path, newPath, options);
  return newPath;
}

export function offsetStroke(path: PathType, distance: number, options?: OffsetOptions): PathType {
  const resolvedOptions = resolveOptions(options);
  const newPath = createOffsetStroke(
    path,
    distance,
    resolvedOptions.join,
    resolvedOptions.cap,
    resolvedOptions.limit,
    resolvedOptions.algorithm
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
  paperNs.Path.prototype.offset = function(distance: number, options?: OffsetOptions) {
    return offset(this, distance, options);
  };

  paperNs.Path.prototype.offsetStroke = function(distance: number, options?: OffsetOptions) {
    return offsetStroke(this, distance, options);
  };

  paperNs.CompoundPath.prototype.offset = function(distance: number, options?: OffsetOptions) {
    return offset(this, distance, options);
  };

  paperNs.CompoundPath.prototype.offsetStroke = function(distance: number, options?: OffsetOptions) {
    return offsetStroke(this, distance, options);
  };
}

export { ExtendPaperJs as extendPaperJs };
