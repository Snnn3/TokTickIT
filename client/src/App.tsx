import { useState } from "react";
import { RequesterProvider, useRequester } from "./context/RequesterContext";
import { RequesterSelection } from "./components/RequesterSelection";
import { AppHeader } from "./components/AppHeader";
import type { TabType } from "./components/AppHeader";
import { CreateTicket } from "./components/CreateTicket";
import { MyTickets } from "./components/MyTickets";

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
          <MyTickets
            onCreateTicket={() => setActiveTab("create-ticket")}
            onSelectTicket={(_id) => {
              // Ticket detail will be wired in Issue #20
            }}
          />
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