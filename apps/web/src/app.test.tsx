import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'
import { WebApp, createWebMemoryRouter } from './app.js'
import { RootErrorBoundary } from './components/root-error-boundary.js'

describe('web application shell', () => {
  test('navigates from landing to the auth boundary', async () => {
    const user = userEvent.setup()
    render(<WebApp router={createWebMemoryRouter(['/'])} />)
    expect(screen.getByRole('heading', { name: 'Meet a Strangr.' })).toBeVisible()
    await user.click(screen.getByRole('link', { name: 'Create your account ↗' }))
    expect(await screen.findByRole('heading', { name: 'Come meet someone new.' })).toBeVisible()
  })

  test('renders authenticated desktop and mobile navigation boundaries', () => {
    render(<WebApp router={createWebMemoryRouter(['/app'])} />)
    expect(screen.getByRole('navigation', { name: 'Mobile navigation' })).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'Friends' })).toHaveLength(2)
    expect(screen.getByRole('heading', { name: 'Meet someone new.' })).toBeVisible()
  })

  test('offers text fallback when video permission is denied', async () => {
    const user = userEvent.setup()
    render(<WebApp router={createWebMemoryRouter(['/conversation/video?permission=denied'])} />)
    expect(screen.getByText('Camera or microphone unavailable.')).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Use text instead' }))
    expect(screen.getByRole('region', { name: 'text conversation preview' })).toBeVisible()
  })

  test('keeps report and report-and-leave as distinct actions', async () => {
    const user = userEvent.setup()
    render(<WebApp router={createWebMemoryRouter(['/conversation/text'])} />)
    await user.click(screen.getByRole('button', { name: 'Report conversation' }))
    expect(screen.getByRole('button', { name: 'Submit report' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Submit and leave' })).toBeVisible()
  })

  test('error boundary shows a recoverable surface', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const Throw = () => {
      throw new Error('test failure')
    }
    render(
      <RootErrorBoundary>
        <Throw />
      </RootErrorBoundary>,
    )
    expect(screen.getByRole('heading', { name: 'Something got crossed.' })).toBeVisible()
    errorSpy.mockRestore()
  })
})
