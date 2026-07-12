import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import {
  RouterProvider,
  createBrowserRouter,
  createMemoryRouter,
  type RouteObject,
} from "react-router-dom";
import { RootErrorBoundary } from "./error-boundary.js";
import { AdminLayout } from "./layout.js";
import {
  AdminLogin,
  AdminPage,
  AppealsPage,
  CasePage,
  QueuePage,
} from "./pages.js";

export const adminRoutes: RouteObject[] = [
  { path: "/", element: <AdminLogin />, errorElement: <RootErrorBoundary /> },
  {
    path: "/admin",
    element: <AdminLayout />,
    errorElement: <RootErrorBoundary />,
    children: [
      { index: true, element: <QueuePage /> },
      { path: "cases/:caseId", element: <CasePage /> },
      {
        path: "users",
        element: (
          <AdminPage
            eyebrow="PURPOSE-BOUND LOOKUP"
            title="User lookup"
            description="Role-gated account lookup will reveal only the minimum context required for support or an active case."
          />
        ),
      },
      {
        path: "appeals",
        element: <AppealsPage />,
      },
      {
        path: "catalog",
        element: (
          <AdminPage
            eyebrow="APPROVED ASSETS"
            title="Catalog"
            description="Cosmetic catalog controls remain unavailable until ownership and safe rendering exist."
          />
        ),
      },
      {
        path: "audit",
        element: (
          <AdminPage
            eyebrow="APPEND ONLY"
            title="Audit trail"
            description="Every sensitive read and mutation will appear here after the admin data model lands."
          />
        ),
      },
      {
        path: "health",
        element: (
          <AdminPage
            eyebrow="OPERATIONS"
            title="Service health"
            description="Privacy-safe operational metrics and runbook links arrive with observability."
          />
        ),
      },
    ],
  },
];

export const createAdminMemoryRouter = (initialEntries: string[] = ["/"]) =>
  createMemoryRouter(adminRoutes, { initialEntries });

function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: 1 } } }),
  );
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

export function AdminApp({
  router = createBrowserRouter(adminRoutes),
}: {
  router?: ReturnType<typeof createBrowserRouter>;
}) {
  return (
    <RootErrorBoundary>
      <Providers>
        <RouterProvider router={router} />
      </Providers>
    </RootErrorBoundary>
  );
}
