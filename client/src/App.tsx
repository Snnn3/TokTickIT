import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useNavigate,
  useParams,
} from "react-router-dom";
import { ChangePassword } from "./components/ChangePassword";
import { CreateTicket } from "./components/CreateTicket";
import { Login } from "./components/Login";
import { MyTickets } from "./components/MyTickets";
import { NotFound, ScreenPanel } from "./components/ScreenPanel";
import { RequesterTicketDetail } from "./components/RequesterTicketDetail";
import { AuthProvider, useAuth } from "./context/AuthContext";
import {
  RedirectIfSignedIn,
  RequireAuth,
  RequireRole,
  RequireSession,
} from "./routes/guards";
import { ROLE_LANDING } from "./types/auth";

/**
 * Application routing [D8, ui-spec section 2].
 *
 * Every screen has a real address, which is what makes the E2E specs and the
 * four screenshot directories tractable: a spec can navigate straight to the
 * screen it is about instead of clicking its way there through three others.
 */

function RoleLanding() {
  const { user } = useAuth();
  return <Navigate replace to={user ? ROLE_LANDING[user.role] : "/login"} />;
}

function LoginRoute() {
  const navigate = useNavigate();
  return <Login onSignedIn={(destination) => navigate(destination)} />;
}

function ChangePasswordRoute() {
  const navigate = useNavigate();
  const { user } = useAuth();
  return (
    <ChangePassword
      destination={user ? ROLE_LANDING[user.role] : "/tickets"}
      onChanged={(destination) => navigate(destination, { replace: true })}
    />
  );
}

function MyTicketsRoute() {
  const navigate = useNavigate();
  return (
    <MyTickets
      onCreateTicket={() => navigate("/tickets/new")}
      onSelectTicket={(ticketId) => navigate(`/tickets/${ticketId}`)}
    />
  );
}

function CreateTicketRoute() {
  const navigate = useNavigate();
  return (
    <CreateTicket
      onCancel={() => navigate("/tickets")}
      onSuccessNavigate={() => navigate("/tickets")}
    />
  );
}

function TicketDetailRoute() {
  const navigate = useNavigate();
  const { ticketId } = useParams();
  const parsed = Number(ticketId);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return <NotFound backTo="/tickets" />;
  }

  return (
    <RequesterTicketDetail
      onBack={() => navigate("/tickets")}
      ticketId={parsed}
    />
  );
}

/**
 * The staff and administrator screens land in later slices (#39, #40 and #41).
 * Their routes and guards exist now because this slice owns the shell, and
 * because a role whose landing address rendered nothing would leave an IT Staff
 * or Administrator sign-in looking broken. The guard in front of each is real
 * and tested; only the body is a placeholder.
 */
function PendingSlice({ title, issue }: { title: string; issue: string }) {
  return (
    <ScreenPanel
      backLabel="Back to my tickets"
      backTo="/tickets"
      description={`This screen arrives with ${issue}. Signing in, the role-aware navigation and the route guard around this address are in place already.`}
      testId="pending-slice-panel"
      title={title}
    />
  );
}

export function AppRoutes() {
  return (
    <Routes>
      <Route
        element={
          <RedirectIfSignedIn>
            <LoginRoute />
          </RedirectIfSignedIn>
        }
        path="/login"
      />
      <Route
        element={
          <RequireSession>
            <ChangePasswordRoute />
          </RequireSession>
        }
        path="/change-password"
      />

      <Route element={<RequireAuth />}>
        <Route element={<RoleLanding />} path="/" />
        <Route element={<MyTicketsRoute />} path="/tickets" />
        <Route element={<CreateTicketRoute />} path="/tickets/new" />
        <Route element={<TicketDetailRoute />} path="/tickets/:ticketId" />

        <Route
          element={<RequireRole allowed={["IT_STAFF", "ADMINISTRATOR"]} />}
        >
          <Route
            element={
              <PendingSlice
                issue="the staff queue slice"
                title="Ticket Queue"
              />
            }
            path="/staff/queue"
          />
          <Route
            element={
              <PendingSlice
                issue="the staff operations slice"
                title="Staff Ticket Detail"
              />
            }
            path="/staff/tickets/:ticketId"
          />
        </Route>

        <Route element={<RequireRole allowed={["ADMINISTRATOR"]} />}>
          <Route
            element={
              <PendingSlice
                issue="the user management slice"
                title="User Management"
              />
            }
            path="/admin/users"
          />
        </Route>

        <Route element={<NotFound backTo="/tickets" />} path="*" />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
