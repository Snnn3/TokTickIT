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
  signOut: () => Promise<void>;
  /** Applied after a successful password change, which clears the gate. */
  applyUser: (user: AuthUser) => void;
}

export type SignInResult =
  | { ok: true; user: AuthUser }
  | { ok: false; message: string };

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
