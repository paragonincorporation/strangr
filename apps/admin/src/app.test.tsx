import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test } from 'vitest'
import { AdminApp, createAdminMemoryRouter } from './app.js'

describe('admin application shell', () => {
  test('keeps login separate and credentials disabled before auth integration', () => {
    render(<AdminApp router={createAdminMemoryRouter(['/'])} />)
    expect(screen.getByRole('heading', { name: 'Admin access.' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Continue to MFA' })).toBeDisabled()
  })

  test('navigates from the preview login to a purpose-limited case queue', async () => {
    const user = userEvent.setup()
    render(<AdminApp router={createAdminMemoryRouter(['/'])} />)
    await user.click(screen.getByRole('link', { name: 'Preview authorized workspace →' }))
    expect(await screen.findByRole('heading', { name: 'Case queue' })).toBeVisible()
    expect(screen.getByRole('navigation', { name: 'Mobile navigation' })).toBeInTheDocument()
  })

  test('case route keeps privileged actions disabled', () => {
    render(<AdminApp router={createAdminMemoryRouter(['/admin/cases/preview'])} />)
    expect(screen.getByRole('heading', { name: 'Minimum necessary context.' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Apply sanction' })).toBeDisabled()
  })
})
