export type Role = "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR";

/**
 * The only user shape any endpoint returns [BR-19]. There is deliberately no
 * token, hash or version here: the session lives in an http-only cookie the
 * client never reads, so there is nothing for injected script to steal.
 */
export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  mustChangePassword: boolean;
}

export interface AuthContextType {
  user: AuthUser | null;
  /** True until the initial current-user probe settles, so guards can wait. */
  loading: boolean;
  signIn: (email: string, password: string) => Promise<SignInResult>;
  /**
   * Signs out [FR-18, FR-30, AC-06]. Local state clears ONLY when the server
   * confirms the revocation (2xx): on a 500 the presented cookie is still
   * valid for up to eight hours, so clearing would report a live session as
   * signed out and strand the retry. Callers stay put on `{ok:false}`.
   */
  signOut: () => Promise<SignOutResult>;
  /** Applied after a successful password change, which clears the gate. */
  applyUser: (user: AuthUser) => void;
}

/** Administrator's safe user-list projection [FR-26, BR-19, BR-24]. */
export interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  ownedOpenTicketCount: number;
}

export type SignInResult =
  | { ok: true; user: AuthUser }
  | { ok: false; message: string };

/** `{ok:false}` keeps the caller signed in so the sign-out can be retried. */
export type SignOutResult = { ok: true } | { ok: false };

export const ROLE_LABELS: Record<Role, string> = {
  REQUESTER: "Requester",
  IT_STAFF: "IT Staff",
  ADMINISTRATOR: "Administrator",
};

/**
 * Where each role lands after signing in [ui-spec section 2]. Differing landing
 * routes are the only sense in which the three roles are "separate" -- ticket
 * permissions are shared, because an Administrator is a superset of IT Staff.
 */
export const ROLE_LANDING: Record<Role, string> = {
  REQUESTER: "/tickets",
  IT_STAFF: "/staff/queue",
  ADMINISTRATOR: "/admin/users",
};
