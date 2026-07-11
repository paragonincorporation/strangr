import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import {
  RouterProvider,
  createBrowserRouter,
  createMemoryRouter,
  type RouteObject,
} from 'react-router-dom'
import { RootErrorBoundary } from './components/root-error-boundary.js'
import { AuthProvider, RequireAuth } from './auth.js'
import { AppLayout, PublicLayout } from './layouts.js'
import {
  AuthPage,
  ConversationPage,
  HomePage,
  LandingPage,
  OnboardingPage,
  PlaceholderPage,
  ProfilePage,
  SettingsPage,
} from './pages.js'

export const webRoutes: RouteObject[] = [
  {
    path: '/',
    element: <PublicLayout />,
    errorElement: <RootErrorBoundary />,
    children: [
      { index: true, element: <LandingPage /> },
      { path: 'auth/sign-in', element: <AuthPage /> },
      { path: 'onboarding', element: <OnboardingPage /> },
    ],
  },
  {
    path: '/app',
    element: (
      <RequireAuth>
        <AppLayout />
      </RequireAuth>
    ),
    errorElement: <RootErrorBoundary />,
    children: [
      { index: true, element: <HomePage /> },
      {
        path: 'friends',
        element: (
          <PlaceholderPage
            description="Accepted friends and incoming requests will live here."
            eyebrow="SOCIAL CIRCLE"
            title="Friends"
          />
        ),
      },
      {
        path: 'messages',
        element: (
          <PlaceholderPage
            description="Persistent one-to-one friend conversations arrive in Unit 16."
            eyebrow="KEEP TALKING"
            title="Messages"
          />
        ),
      },
      {
        path: 'history',
        element: (
          <PlaceholderPage
            description="Your privacy-aware 48-hour encounter window arrives in Unit 12."
            eyebrow="RECENT ENCOUNTERS"
            title="History"
          />
        ),
      },
      {
        path: 'profile',
        element: <ProfilePage />,
      },
      {
        path: 'premium',
        element: (
          <PlaceholderPage
            description="Premium remains disabled until server-backed Stripe entitlements exist."
            eyebrow="MORE CHOICE"
            title="Premium"
          />
        ),
      },
      {
        path: 'settings',
        element: <SettingsPage />,
      },
    ],
  },
  {
    path: '/conversation/:mode',
    element: (
      <RequireAuth>
        <ConversationPage />
      </RequireAuth>
    ),
    errorElement: <RootErrorBoundary />,
  },
]

export const createWebMemoryRouter = (initialEntries: string[] = ['/']) =>
  createMemoryRouter(webRoutes, { initialEntries })

function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: 1, staleTime: 20_000 },
          mutations: { retry: 0 },
        },
      }),
  )
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

export function WebApp({
  router = createBrowserRouter(webRoutes),
}: {
  router?: ReturnType<typeof createBrowserRouter>
}) {
  return (
    <RootErrorBoundary>
      <AuthProvider>
        <Providers>
          <RouterProvider router={router} />
        </Providers>
      </AuthProvider>
    </RootErrorBoundary>
  )
}
