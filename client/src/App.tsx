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
import { NotFound } from "./components/ScreenPanel";
import { RequesterTicketDetail } from "./components/RequesterTicketDetail";
import { StaffTicketDetail } from "./components/StaffTicketDetail";
import { StaffTicketQueue } from "./components/StaffTicketQueue";
import { UserManagement } from "./components/UserManagement";
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
 * Staff queue [FR-22, ui-spec section 6]. Any row opens for action on the
 * staff detail screen.
 */
function StaffQueueRoute() {
  const navigate = useNavigate();
  return (
    <StaffTicketQueue
      onSelectTicket={(ticketId) => navigate(`/staff/tickets/${ticketId}`)}
    />
  );
}

/**
 * Staff detail [FR-23, FR-24, ui-spec section 7]. The queue's Open action
 * lands here; a ticket the viewer filed themselves still loads with the
 * operational card replaced by an explanation and no notes [BR-25].
 */
function StaffTicketDetailRoute() {
  const navigate = useNavigate();
  const { ticketId } = useParams();
  const parsed = Number(ticketId);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return <NotFound backTo="/staff/queue" />;
  }

  return (
    <StaffTicketDetail
      onBack={() => navigate("/staff/queue")}
      ticketId={parsed}
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
          <Route element={<StaffQueueRoute />} path="/staff/queue" />
          <Route
            element={<StaffTicketDetailRoute />}
            path="/staff/tickets/:ticketId"
          />
        </Route>

        <Route element={<RequireRole allowed={["ADMINISTRATOR"]} />}>
          <Route element={<UserManagement />} path="/admin/users" />
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
