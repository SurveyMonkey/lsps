// A plain JSON object check, for code that reads what another process
// sent. `typeof` answers `'object'` for `null` and for an array too, so this
// function excludes both. Without it, an array would read as an object that
// carries none of the properties a contract promises.
//
// This file ships. It imports nothing, and stays inside the erasable subset
// (ADR 001).

/** True for a non-null, non-array object. */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
