// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { DivineActionPanel } from './divine-action-panel'

describe('DivineActionPanel integration', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  afterEach(() => {
    cleanup()
  })

  it('supports preview and apply flows with visible result states', () => {
    const onPreview = vi.fn(() => [{ action: { type: 'set_project_name', name: 'Campaign Alpha' }, ok: true, detail: 'Would rename project' }])
    const onApply = vi.fn(() => [{ action: { type: 'set_project_name', name: 'Campaign Alpha' }, ok: true, detail: 'Project renamed' }])

    render(<DivineActionPanel enabled={true} onPreview={onPreview} onApply={onApply} />)

    const rawInput = screen.getByPlaceholderText(
      '[{"type":"set_project_name","name":"My campaign"},{"type":"set_export_format","format":"mov"}]',
    )
    fireEvent.change(rawInput, {
      target: {
        value: JSON.stringify([{ type: 'set_project_name', name: 'Campaign Alpha' }]),
      },
    })

    expect(screen.getByText(/1 parsed/i)).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Preview plan' }))
    expect(onPreview).toHaveBeenCalledTimes(1)
    expect(screen.getByText('Preview only (no changes applied)')).toBeTruthy()
    expect(screen.getByText(/Would rename project/i)).toBeTruthy()

    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(screen.getByRole('button', { name: 'Apply actions' }))
    expect(onApply).toHaveBeenCalledTimes(1)
    expect(screen.getByText('Applied actions')).toBeTruthy()
    expect(screen.getByText(/Project renamed/i)).toBeTruthy()
  })

  it('blocks nonce replay on repeated apply for the same signed envelope', () => {
    const onPreview = vi.fn(() => [{ action: { type: 'set_project_name', name: 'Campaign Beta' }, ok: true, detail: 'Would rename project' }])
    const onApply = vi.fn(() => [{ action: { type: 'set_project_name', name: 'Campaign Beta' }, ok: true, detail: 'Project renamed' }])

    render(<DivineActionPanel enabled={true} onPreview={onPreview} onApply={onApply} />)

    const envelopePayload = JSON.stringify({
      version: 1,
      source: 'divine-test',
      issuedAt: new Date().toISOString(),
      nonce: 'nonce-ui-replay-1',
      actions: [{ type: 'set_project_name', name: 'Campaign Beta' }],
    })

    const rawInput = screen.getByPlaceholderText(
      '[{"type":"set_project_name","name":"My campaign"},{"type":"set_export_format","format":"mov"}]',
    )
    fireEvent.change(rawInput, { target: { value: envelopePayload } })
    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(screen.getByRole('button', { name: 'Apply actions' }))

    expect(onApply).toHaveBeenCalledTimes(1)
    expect(screen.getByText('Applied actions')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Apply actions' }))
    expect(onApply).toHaveBeenCalledTimes(1)
    expect(screen.getByText(/replay blocked/i)).toBeTruthy()
  })
})
