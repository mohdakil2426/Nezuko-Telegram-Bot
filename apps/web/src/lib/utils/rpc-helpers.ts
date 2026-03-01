/**
 * Unwrap an RPC envelope response into a typed series array.
 *
 * InsForge RPC functions return data in two formats:
 * 1. Flat array: T[]
 * 2. Envelope: { period, series: T[], ...metadata }
 *
 * This utility normalizes both into T[].
 */
export function unwrapEnvelopeSeries<T>(data: unknown): T[] {
  if (Array.isArray(data)) {
    return data as T[];
  }
  if (data && typeof data === "object") {
    const envelope = data as Record<string, unknown>;
    if (Array.isArray(envelope.series)) {
      return envelope.series as T[];
    }
  }
  return [];
}

/**
 * Extract metadata from an RPC envelope response.
 */
export function extractEnvelopeMetadata(data: unknown): Record<string, unknown> | null {
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const { series: _series, ...metadata } = data as Record<string, unknown>;
    return metadata;
  }
  return null;
}
