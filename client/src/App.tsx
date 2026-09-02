import { useState } from "react";
import { RequesterProvider, useRequester } from "./context/RequesterContext";
import { RequesterSelection } from "./components/RequesterSelection";
import { AppHeader } from "./components/AppHeader";
import type { TabType } from "./components/AppHeader";
import { CreateTicket } from "./components/CreateTicket";
import { MyTickets } from "./components/MyTickets";
import { RequesterTicketDetail } from "./components/RequesterTicketDetail";

function MainApp() {
  const { selectedRequester } = useRequester();
  const [activeTab, setActiveTab] = useState<TabType>("my-tickets");
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);

  if (!selectedRequester) {
    return <RequesterSelection />;
  }

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setSelectedTicketId(null);
  };

  return (
    <div className="min-vh-100 d-flex flex-column bg-light">
      <AppHeader activeTab={activeTab} onTabChange={handleTabChange} />
      <main className="container py-4 flex-grow-1" style={{ maxWidth: "1100px" }}>
        {activeTab === "my-tickets" && (
          selectedTicketId ? (
            <RequesterTicketDetail
              ticketId={selectedTicketId}
              requesterId={selectedRequester.id}
              onBack={() => setSelectedTicketId(null)}
            />
          ) : (
            <MyTickets
              onCreateTicket={() => {
                setActiveTab("create-ticket");
                setSelectedTicketId(null);
              }}
              onSelectTicket={(id) => setSelectedTicketId(id)}
            />
          )
        )}

        {activeTab === "create-ticket" && (
          <CreateTicket
            onSuccessNavigate={() => {
              setActiveTab("my-tickets");
              setSelectedTicketId(null);
            }}
            onCancel={() => {
              setActiveTab("my-tickets");
              setSelectedTicketId(null);
            }}
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