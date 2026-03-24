import { describe, it, expect } from 'vitest'
import { calculateRunway, calculateChurnRate, calculateMRRGrowth } from './utils'

describe('utils', () => {
  it('calculateRunway returns infinite when not burning', () => {
    expect(calculateRunway(10000, -100)).toBe(9999)
    expect(calculateRunway(10000, 0)).toBe(9999)
  })

  it('calculateRunway floors days from balance and monthly burn', () => {
    expect(calculateRunway(3000, 1000)).toBe(90)
  })

  it('calculateChurnRate handles zero active', () => {
    expect(calculateChurnRate(5, 0)).toBe(0)
  })

  it('calculateMRRGrowth returns percent change', () => {
    expect(calculateMRRGrowth(110, 100)).toBeCloseTo(10)
  })
})
