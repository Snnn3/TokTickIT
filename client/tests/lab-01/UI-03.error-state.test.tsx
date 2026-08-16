import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../../src/App'

describe('Check System - API failure', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('displays a useful error message when the API is unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')))

    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Check System' }))
    expect(
      await screen.findByText(/Unable to connect to TokTickIT API/),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        (_content, element) => element?.textContent === 'System Status: Offline',
      ),
    ).toBeInTheDocument()
  })
})