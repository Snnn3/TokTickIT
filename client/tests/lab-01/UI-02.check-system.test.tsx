import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../../src/App'

const SEEDED_CATEGORIES = [
  { id: 1, name: 'Account and Access' },
  { id: 2, name: 'Hardware' },
  { id: 3, name: 'Software' },
  { id: 4, name: 'Network' },
]

describe('Check System', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shows the loading state, then Online with the category list', async () => {
    let resolveFetch: (value: unknown) => void
    const fetchPromise = new Promise((resolve) => {
      resolveFetch = resolve
    })
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) =>
        fetchPromise.then(() =>
          url === '/api/health'
            ? { ok: true, json: async () => ({ status: 'ok', service: 'TokTickIT API' }) }
            : { ok: true, json: async () => SEEDED_CATEGORIES },
        ),
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

    for (const category of SEEDED_CATEGORIES) {
      expect(screen.getByText(category.name)).toBeInTheDocument()
    }
    expect(screen.getByText('Supported Request Categories')).toBeInTheDocument()
    expect(screen.queryByText(/loading/)).not.toBeInTheDocument()
  })
})