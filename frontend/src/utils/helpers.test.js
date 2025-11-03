import { describe, it, expect } from 'vitest'
import { formatCurrency, formatTime, formatPhone } from './helpers'

describe('helpers', () => {
  it('formats currency with two decimals', () => {
    expect(formatCurrency(0)).toBe('$0.00')
    expect(formatCurrency(12.3)).toBe('$12.30')
    expect(formatCurrency(99.999)).toBe('$100.00')
  })

  it('formats time in minutes', () => {
    expect(formatTime(0)).toBe('Less than 1 min')
    expect(formatTime(1)).toBe('1 min')
    expect(formatTime(5)).toBe('5 mins')
  })

  it('formats phone number with country code', () => {
    expect(formatPhone('11234567890')).toBe('+1 (123) 456-7890')
  })
})

