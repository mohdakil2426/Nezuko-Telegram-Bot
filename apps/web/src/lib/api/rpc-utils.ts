/**
 * RPC Utilities
 * Helpers for handling InsForge RPC responses
 */

/**
 * Robustly unwrap a JSON result from an InsForge RPC.
 *
 * Depending on the InsForge version and function return type, PostgREST might
 * wrap the JSON result in a property named after the function, or return
 * an array containing such a wrapper object.
 *
 * @param data - Raw response from insforge.database.rpc
 * @param functionName - Name of the RPC function called
 * @returns Unwrapped data or raw data if not wrapped
 */
export function unwrapRpc<T>(data: unknown, functionName: string): T {
  if (Array.isArray(data) && data.length > 0) {
    const first = data[0];
    if (data.length === 1 && first && typeof first === "object" && functionName in first) {
      return (first as Record<string, unknown>)[functionName] as T;
    }
    return data as T;
  }

  // Case 2: Object wrapper { "func_name": { ... } }
  if (data && typeof data === "object" && functionName in data) {
    return (data as Record<string, unknown>)[functionName] as T;
  }

  // Case 3: Already unwrapped or scalar
  return data as T;
}
