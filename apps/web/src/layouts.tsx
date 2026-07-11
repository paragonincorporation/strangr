import { AppFrame, Avatar, Badge } from '@strangr/ui'
import { Link, NavLink, Outlet } from 'react-router-dom'

const appLinks = [
  { to: '/app', label: 'Home', end: true },
  { to: '/app/friends', label: 'Friends' },
  { to: '/app/messages', label: 'Messages' },
  { to: '/app/history', label: 'History' },
  { to: '/app/profile', label: 'Profile' },
  { to: '/app/premium', label: 'Premium' },
  { to: '/app/settings', label: 'Settings' },
]

function Navigation({ mobile = false }: { mobile?: boolean }) {
  const links = mobile
    ? appLinks.filter((link) => ['Home', 'Friends', 'Messages', 'Profile'].includes(link.label))
    : appLinks
  return (
    <div className={mobile ? 'mobile-links' : 'side-links'}>
      {links.map((link) => (
        <NavLink
          className={({ isActive }) => (isActive ? 'is-active' : undefined)}
          {...(link.end ? { end: true } : {})}
          key={link.to}
          to={link.to}
        >
          <span aria-hidden="true">{link.label.slice(0, 1)}</span>
          {link.label}
        </NavLink>
      ))}
    </div>
  )
}

export function PublicLayout() {
  return (
    <div className="public-shell">
      <a className="ui-skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="public-header">
        <Link className="public-wordmark" to="/">
          STRANGR<i>.</i>
        </Link>
        <nav aria-label="Public navigation">
          <Link to="/auth/sign-in">Sign in</Link>
          <Link className="safety-link" to="/onboarding">
            Safety first
          </Link>
        </nav>
      </header>
      <Outlet />
    </div>
  )
}

export function AppLayout() {
  return (
    <AppFrame
      headerActions={
        <>
          <Badge tone="success">Foundation preview</Badge>
          <Avatar name="Your profile" size="small" />
        </>
      }
      mobileNavigation={<Navigation mobile />}
      navigation={<Navigation />}
    >
      <Outlet />
    </AppFrame>
  )
}
