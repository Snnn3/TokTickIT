/**
 * A signing secret for the suite.
 *
 * The server reads JWT_SECRET from its environment and refuses to sign without
 * one, which is correct (BR-08) but would make the API suites depend on a
 * developer's local `.env`. This value exists only inside the test process, is
 * never a real secret, and is set rather than overridden so a CI environment
 * supplying its own still wins.
 */
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = "test-only-signing-secret-not-used-anywhere-else";
}
