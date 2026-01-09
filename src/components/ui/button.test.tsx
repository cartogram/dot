import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { userEvent } from 'vitest/browser'
import { Button } from './button'

describe('Button component', () => {
  it('should render button with text', async () => {
    render(<Button>Click me</Button>)
    const button = screen.getByRole('button', { name: /click me/i })
    expect(button).toBeDefined()
  })

  it('should handle click events', async () => {
    let clicked = false
    render(<Button onClick={() => { clicked = true }}>Click me</Button>)

    const button = screen.getByRole('button', { name: /click me/i })
    await userEvent.click(button)

    expect(clicked).toBe(true)
  })

  it('should be disabled when disabled prop is true', async () => {
    render(<Button disabled>Disabled button</Button>)
    const button = screen.getByRole('button', { name: /disabled button/i })
    expect(button.hasAttribute('disabled')).toBe(true)
  })

  it('should apply variant classes', async () => {
    render(<Button variant="outline">Outline button</Button>)
    const button = screen.getByRole('button', { name: /outline button/i })
    expect(button.className).toContain('outline')
  })
})
