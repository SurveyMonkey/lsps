import { expect, it } from 'vitest'
import { isRecord } from '#lib/records.ts'

it('accepts a plain object', () => {
  expect(isRecord({})).toBe(true)
  expect(isRecord({ a: 1 })).toBe(true)
})

it('refuses null, arrays and primitives, which typeof calls object or not', () => {
  expect(isRecord(null)).toBe(false)
  expect(isRecord([])).toBe(false)
  expect(isRecord([{ a: 1 }])).toBe(false)
  expect(isRecord('x')).toBe(false)
  expect(isRecord(1)).toBe(false)
  expect(isRecord(undefined)).toBe(false)
})
