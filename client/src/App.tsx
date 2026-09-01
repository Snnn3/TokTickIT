import { useState } from "react";
import { RequesterProvider, useRequester } from "./context/RequesterContext";
import { RequesterSelection } from "./components/RequesterSelection";
import { AppHeader } from "./components/AppHeader";
import type { TabType } from "./components/AppHeader";
import { CreateTicket } from "./components/CreateTicket";

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
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h2 className="h4 fw-semibold mb-0">My Tickets</h2>
              <button
                type="button"
                className="btn btn-zen-primary btn-sm"
                onClick={() => setActiveTab("create-ticket")}
              >
                + Create Ticket
              </button>
            </div>
            <p className="text-muted">
              Welcome, <strong>{selectedRequester.name}</strong>. Tickets list view will be implemented in Issue #19.
            </p>
          </div>
        )}

        {activeTab === "create-ticket" && (
          <CreateTicket
            onSuccessNavigate={() => setActiveTab("my-tickets")}
            onCancel={() => setActiveTab("my-tickets")}
          />
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