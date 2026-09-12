import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ROLE_LABELS } from "../types/auth";
import type { Role } from "../types/auth";

/**
 * Authenticated application shell header [FR-18, FR-19, AC-27].
 *
 * Navigation is filtered by role, but filtering is a convenience only: every
 * destination it hides is also refused by the server, because hiding a control
 * is not authorization.
 */

interface NavDestination {
  to: string;
  label: string;
  roles: Role[];
}

const ALL_ROLES: Role[] = ["REQUESTER", "IT_STAFF", "ADMINISTRATOR"];
const STAFF_ROLES: Role[] = ["IT_STAFF", "ADMINISTRATOR"];

/** Every role files its own tickets (FR-27), so the first two are unrestricted. */
const DESTINATIONS: NavDestination[] = [
  { to: "/tickets", label: "My Tickets", roles: ALL_ROLES },
  { to: "/tickets/new", label: "Create Ticket", roles: ALL_ROLES },
  { to: "/staff/queue", label: "Ticket Queue", roles: STAFF_ROLES },
  { to: "/admin/users", label: "Users", roles: ["ADMINISTRATOR"] },
];

export function RoleBadge({ role }: { role: Role }) {
  return (
    <span className={`zg-role-badge zg-role-${role.toLowerCase()}`}>
      {ROLE_LABELS[role]}
    </span>
  );
}

export function AppHeader() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [navExpanded, setNavExpanded] = useState(false);

  if (!user) {
    return null;
  }

  const destinations = DESTINATIONS.filter((destination) =>
    destination.roles.includes(user.role)
  );

  const handleSignOut = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  return (
    <nav className="navbar navbar-expand-md zg-header sticky-top py-2 px-3 shadow-sm">
      <div className="container-fluid">
        <span className="navbar-brand fw-bold text-white mb-0">TokTickIT</span>

        <button
          aria-controls="navbarNav"
          aria-expanded={navExpanded}
          aria-label="Toggle navigation"
          className="navbar-toggler text-white border-white"
          onClick={() => setNavExpanded(!navExpanded)}
          type="button"
        >
          <span
            className="navbar-toggler-icon"
            style={{ filter: "invert(1)" }}
          />
        </button>

        <div
          className={`collapse navbar-collapse ${navExpanded ? "show" : ""}`}
          id="navbarNav"
        >
          <ul className="navbar-nav me-auto mb-2 mb-md-0 gap-1">
            {destinations.map((destination) => (
              <li className="nav-item" key={destination.to}>
                <NavLink
                  className={({ isActive }) =>
                    `nav-link text-decoration-none ${isActive ? "active" : ""}`
                  }
                  end={destination.to === "/tickets"}
                  onClick={() => setNavExpanded(false)}
                  to={destination.to}
                >
                  {destination.label}
                </NavLink>
              </li>
            ))}
          </ul>

          <div className="d-flex flex-column flex-md-row align-items-md-center gap-2 mt-2 mt-md-0">
            <span className="zg-requester-chip" data-testid="identity-chip">
              <span>
                Signed in as <strong>{user.name}</strong>
              </span>
              <RoleBadge role={user.role} />
            </span>
            <button
              className="btn btn-sm btn-outline-light"
              data-testid="logout-btn"
              onClick={handleSignOut}
              type="button"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
