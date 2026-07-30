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

function assertFiniteNumber(value: number, name: string) {
  if (!Number.isFinite(value)) {
    throw new TypeError(`${name} must be a finite number`);
  }
}

function resolveOptions(options?: OffsetOptions): ResolvedOffsetOptions {
  const join = options?.join ?? 'miter';
  const cap = options?.cap ?? 'butt';
  const limit = options?.limit ?? 10;
  const algorithm = options?.algorithm ?? 'auto';

  if (join !== 'miter' && join !== 'bevel' && join !== 'round') {
    throw new RangeError(`Unsupported join type: ${String(join)}`);
  }
  if (cap !== 'butt' && cap !== 'round') {
    throw new RangeError(`Unsupported cap type: ${String(cap)}`);
  }
  assertFiniteNumber(limit, 'Miter limit');
  if (limit < 0) {
    throw new RangeError('Miter limit must be greater than or equal to zero');
  }
  if (algorithm !== 'auto' && algorithm !== 'adaptive' && algorithm !== 'robust'
    && algorithm !== 'split' && algorithm !== 'legacy') {
    throw new RangeError(`Unsupported offset algorithm: ${String(algorithm)}`);
  }

  return { join, cap, limit, algorithm };
}

function assertPath(path: PathType, requireCurve: boolean) {
  if (!(path instanceof paper.Path) && !(path instanceof paper.CompoundPath)) {
    throw new TypeError('Offset source must be a Paper.js Path or CompoundPath');
  }
  if (!requireCurve) {
    return;
  }
  const children = path instanceof paper.CompoundPath
    ? path.children as paper.Path[]
    : [path];
  const hasCurve = children.some((child) => {
    return child.curves.some((curve) => Number.isFinite(curve.length) && curve.length > 0);
  });
  if (!hasCurve) {
    throw new RangeError('Offset source must contain at least one non-zero-length curve');
  }
}

function insertResult(source: PathType, result: PathType, options?: OffsetOptions) {
  if (!options || options.insert !== false) {
    (source.parent || paper.project.activeLayer).addChild(result);
  }
}

export function offset(path: PathType, distance: number, options?: OffsetOptions): PathType {
  assertFiniteNumber(distance, 'Offset distance');
  assertPath(path, distance !== 0);
  const resolvedOptions = resolveOptions(options);
  if (distance === 0) {
    const result = path.clone({ insert: false }) as PathType;
    insertResult(path, result, options);
    return result;
  }
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
  assertFiniteNumber(distance, 'Offset distance');
  assertPath(path, true);
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
  assertFiniteNumber(distance, 'Offset distance');
  assertPath(source, false);
  assertPath(result, false);
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
