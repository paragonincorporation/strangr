import { AppFrame, Avatar, Badge } from "@paramingle/ui";
import { NavLink, Outlet } from "react-router-dom";

const links = [
  { to: "/admin", label: "Case queue", end: true },
  { to: "/admin/users", label: "User lookup" },
  { to: "/admin/appeals", label: "Appeals" },
  { to: "/admin/launch-countries", label: "Launch countries" },
  { to: "/admin/catalog", label: "Catalog" },
  { to: "/admin/audit", label: "Audit" },
  { to: "/admin/health", label: "Health" },
];

function Navigation({ mobile = false }: { mobile?: boolean }) {
  const visible = mobile ? links.slice(0, 4) : links;
  return (
    <div className={mobile ? "admin-mobile-links" : "admin-links"}>
      {visible.map((link) => (
        <NavLink
          className={({ isActive }) => (isActive ? "is-active" : undefined)}
          {...(link.end ? { end: true } : {})}
          key={link.to}
          to={link.to}
        >
          <span aria-hidden="true">{link.label[0]}</span>
          {link.label}
        </NavLink>
      ))}
    </div>
  );
}

export function AdminLayout() {
  return (
    <AppFrame
      environmentLabel="ADMIN · MFA REQUIRED"
      headerActions={
        <>
          <Badge tone="warning">No active session</Badge>
          <Avatar name="Admin operator" size="small" />
        </>
      }
      mobileNavigation={<Navigation mobile />}
      navigation={
        <>
          <p className="admin-nav-label">MODERATION</p>
          <Navigation />
          <p className="admin-boundary-note">
            This shell never shares user-app session state.
          </p>
        </>
      }
      productName="PARAMINGLE ADMIN"
    >
      <Outlet />
    </AppFrame>
  );
}
