import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../../src/App'

describe('Check System', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shows the loading state, then Online when the API responds', async () => {
    let resolveFetch: (value: unknown) => void
    const fetchPromise = new Promise((resolve) => {
      resolveFetch = resolve
    })
    vi.stubGlobal(
      'fetch',
      vi.fn().mockReturnValue(
        fetchPromise.then(() => ({
          ok: true,
          json: async () => ({ status: 'ok', service: 'TokTickIT API' }),
        })),
      ),
    )

    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Check System' }))
    expect(screen.getByText(/loading/)).toBeInTheDocument()

    resolveFetch!(undefined)
    expect(
      await screen.findByText(
        (_content, element) => element?.textContent === 'System Status: Online',
      ),
    ).toBeInTheDocument()
  })

  it('displays a useful error message when the API is unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')))

    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Check System' }))
    expect(
      await screen.findByText(/Unable to connect to TokTickIT API/),
    ).toBeInTheDocument()
  })
})
