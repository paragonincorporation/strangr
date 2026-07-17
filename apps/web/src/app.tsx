import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import {
  RouterProvider,
  createBrowserRouter,
  createMemoryRouter,
  type RouteObject,
} from "react-router-dom";
import { RootErrorBoundary } from "./components/root-error-boundary.js";
import { AuthProvider, RequireAuth } from "./auth.js";
import { AppLayout, PublicLayout } from "./layouts.js";
import {
  AuthPage,
  ConversationPage,
  HomePage,
  HistoryPage,
  FriendsPage,
  OtherProfilePage,
  LandingPage,
  OnboardingPage,
  ProfilePage,
  SettingsPage,
  MessagesPage,
  PremiumPage,
} from "./pages.js";

export const webRoutes: RouteObject[] = [
  {
    path: "/",
    element: <PublicLayout />,
    errorElement: <RootErrorBoundary />,
    children: [
      { index: true, element: <LandingPage /> },
      { path: "auth/sign-in", element: <AuthPage /> },
      { path: "auth/sign-up", element: <AuthPage initialMode="sign_up" /> },
      { path: "onboarding", element: <OnboardingPage /> },
    ],
  },
  {
    path: "/app",
    element: (
      <RequireAuth>
        <AppLayout />
      </RequireAuth>
    ),
    errorElement: <RootErrorBoundary />,
    children: [
      { index: true, element: <HomePage /> },
      {
        path: "friends",
        element: <FriendsPage />,
      },
      { path: "people/:username", element: <OtherProfilePage /> },
      {
        path: "messages",
        element: <MessagesPage />,
      },
      {
        path: "history",
        element: <HistoryPage />,
      },
      {
        path: "profile",
        element: <ProfilePage />,
      },
      {
        path: "premium",
        element: <PremiumPage />,
      },
      {
        path: "settings",
        element: <SettingsPage />,
      },
    ],
  },
  {
    path: "/conversation/:mode",
    element: (
      <RequireAuth>
        <ConversationPage />
      </RequireAuth>
    ),
    errorElement: <RootErrorBoundary />,
  },
];

export const createWebMemoryRouter = (initialEntries: string[] = ["/"]) =>
  createMemoryRouter(webRoutes, { initialEntries });

function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: 1, staleTime: 20_000 },
          mutations: { retry: 0 },
        },
      }),
  );
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

export function WebApp({
  router = createBrowserRouter(webRoutes),
}: {
  router?: ReturnType<typeof createBrowserRouter>;
}) {
  return (
    <RootErrorBoundary>
      <AuthProvider>
        <Providers>
          <RouterProvider router={router} />
        </Providers>
      </AuthProvider>
    </RootErrorBoundary>
  );
}
