import { describe, expect, it } from 'vitest'
import { cn } from './utils'

describe('cn utility', () => {
  it('should merge class names correctly', () => {
    const result = cn('foo', 'bar')
    expect(result).toBe('foo bar')
  })

  it('should handle conditional classes', () => {
    const condition = false as boolean
    const result = cn('foo', condition && 'bar', 'baz')
    expect(result).toBe('foo baz')
  })

  it('should handle objects', () => {
    const result = cn({ foo: true, bar: false, baz: true })
    expect(result).toBe('foo baz')
  })

  it('should handle arrays', () => {
    const result = cn(['foo', 'bar'])
    expect(result).toBe('foo bar')
  })

  it('should handle mixed inputs', () => {
    const result = cn('base-class', { active: true, disabled: false }, ['extra', undefined])
    expect(result).toBe('base-class active extra')
  })
})
