import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";

const SERVER_ROOT = resolve(__dirname, "../..");
const LABEL = "toktickit.disposable-dashboard-test";

/** Never accepts DATABASE_URL: each run owns a new container, database and port. */
export async function createDisposableDatabase() {
  const name = `toktickit-dashboard-test-${randomUUID()}`;
  const id = execFileSync(
    "docker",
    [
      "run",
      "--detach",
      "--rm",
      "--name",
      name,
      "--label",
      `${LABEL}=${name}`,
      "--publish",
      "127.0.0.1::5432",
      "--env",
      "POSTGRES_USER=postgres",
      "--env",
      "POSTGRES_PASSWORD=disposable-test-only",
      "--env",
      "POSTGRES_DB=toktickit_dashboard_test",
      "postgres:17-alpine",
    ],
    { encoding: "utf8", timeout: 60000 }
  ).trim();
  if (!/^[a-f0-9]{64}$/.test(id))
    throw new Error("Unexpected disposable container ID");

  const dispose = () => {
    const owner = execFileSync(
      "docker",
      ["inspect", "--format", `{{index .Config.Labels "${LABEL}"}}`, id],
      { encoding: "utf8" }
    ).trim();
    if (owner !== name)
      throw new Error(
        "Refusing to stop a container not owned by this test run"
      );
    execFileSync("docker", ["stop", "--time", "1", id], {
      stdio: "ignore",
      timeout: 15000,
    });
  };

  try {
    const deadline = Date.now() + 30000;
    for (;;) {
      try {
        execFileSync(
          "docker",
          [
            "exec",
            id,
            "pg_isready",
            "-h",
            "127.0.0.1",
            "-U",
            "postgres",
            "-d",
            "toktickit_dashboard_test",
          ],
          { stdio: "ignore" }
        );
        break;
      } catch {
        if (Date.now() >= deadline)
          throw new Error("Disposable PostgreSQL did not become ready");
        await new Promise((resolveReady) => setTimeout(resolveReady, 500));
      }
    }
    const binding = execFileSync("docker", ["port", id, "5432/tcp"], {
      encoding: "utf8",
    }).trim();
    if (!/^127\.0\.0\.1:\d+$/.test(binding))
      throw new Error("Unexpected disposable database port binding");
    const url = `postgresql://postgres:disposable-test-only@${binding}/toktickit_dashboard_test?schema=public`;
    execFileSync(
      process.execPath,
      [
        resolve(SERVER_ROOT, "node_modules/prisma/build/index.js"),
        "migrate",
        "deploy",
      ],
      {
        cwd: SERVER_ROOT,
        env: { ...process.env, DATABASE_URL: url },
        stdio: "pipe",
        timeout: 60000,
      }
    );
    return { url, dispose };
  } catch (error) {
    dispose();
    throw error;
  }
}

export function requireDisposableDatabase(): string {
  const url = process.env.TOKTICKIT_DISPOSABLE_DATABASE_URL;
  if (
    !url ||
    process.env.DATABASE_URL !== url ||
    !/^postgresql:\/\/postgres:disposable-test-only@127\.0\.0\.1:\d+\/toktickit_dashboard_test\?schema=public$/.test(
      url
    )
  ) {
    throw new Error(
      "Use the isolated dashboard test runner; shared databases are forbidden"
    );
  }
  return url;
}
