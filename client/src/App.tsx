import { useState } from "react";
import { RequesterProvider, useRequester } from "./context/RequesterContext";
import { RequesterSelection } from "./components/RequesterSelection";
import { AppHeader } from "./components/AppHeader";
import type { TabType } from "./components/AppHeader";

function MainApp() {
  const { selectedRequester } = useRequester();
  const [activeTab, setActiveTab] = useState<TabType>("my-tickets");

  if (!selectedRequester) {
    return <RequesterSelection />;
  }

  return (
    <div className="min-vh-100 d-flex flex-column bg-light">
      <AppHeader activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="container py-4 flex-grow-1" style={{ maxWidth: "1100px" }}>
        {activeTab === "my-tickets" && (
          <div className="zg-card p-4">
            <h2 className="h4 fw-semibold mb-3">My Tickets</h2>
            <p className="text-muted">
              Welcome, <strong>{selectedRequester.name}</strong>. Tickets list will be implemented in Issue #19.
            </p>
          </div>
        )}

        {activeTab === "create-ticket" && (
          <div className="zg-card p-4">
            <h2 className="h4 fw-semibold mb-3">Create Ticket</h2>
            <p className="text-muted">
              Ticket creation form will be implemented in Issue #18.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <RequesterProvider>
      <MainApp />
    </RequesterProvider>
  );
}