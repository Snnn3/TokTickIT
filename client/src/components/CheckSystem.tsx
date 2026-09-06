import { useState } from "react";

type Category = { id: number; name: string };
type SystemState = "idle" | "loading" | "online" | "offline";

export function CheckSystem() {
  const [systemState, setSystemState] = useState<SystemState>("idle");
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function checkSystem() {
    setSystemState("loading");
    setError(null);
    setCategories([]);
    try {
      const [healthRes, categoriesRes] = await Promise.all([
        fetch("/api/health"),
        fetch("/api/categories"),
      ]);
      if (!healthRes.ok || !categoriesRes.ok) throw new Error(`HTTP error`);
      const health = await healthRes.json();
      if (health.status !== "ok") throw new Error("API not ok");
      setCategories(await categoriesRes.json());
      setSystemState("online");
    } catch {
      setSystemState("offline");
      setError("Unable to connect to TokTickIT API");
    }
  }

  return (
    <div className="min-vh-100 d-flex flex-column">
      <nav className="navbar navbar-dark bg-primary">
        <div className="container">
          <span className="navbar-brand fw-bold">TokTickIT IT Service Desk</span>
        </div>
      </nav>
      <main className="container py-4 flex-grow-1">
        <h1 className="h3">TokTickIT IT Service Desk</h1>
        <button type="button" className="btn btn-primary" onClick={checkSystem}>
          Check System
        </button>

        {systemState === "loading" && (
          <p className="mt-3 text-body-secondary">&#8987; loading&hellip;</p>
        )}

        {systemState === "online" && (
          <div className="mt-3">
            <p>
              System Status: <span className="badge text-bg-success">Online</span>
            </p>
            <p className="mb-1">Supported Request Categories</p>
            <ol className="mb-0">
              {categories.map((category) => (
                <li key={category.id}>{category.name}</li>
              ))}
            </ol>
          </div>
        )}

        {systemState === "offline" && (
          <div className="mt-3">
            <p>
              System Status: <span className="badge text-bg-danger">Offline</span>
            </p>
            {error && <p className="alert alert-danger">{error}</p>}
          </div>
        )}
      </main>
    </div>
  );
}

export default CheckSystem;
