import { useState } from "react";
import { useRequester } from "../context/RequesterContext";

export type TabType = "my-tickets" | "create-ticket";

interface AppHeaderProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export function AppHeader({ activeTab, onTabChange }: AppHeaderProps) {
  const { selectedRequester, clearRequester } = useRequester();
  const [navExpanded, setNavExpanded] = useState(false);

  return (
    <nav className="navbar navbar-expand-md zg-header sticky-top py-2 px-3 shadow-sm">
      <div className="container-fluid">
        <span
          className="navbar-brand fw-bold text-white mb-0"
          style={{ cursor: "pointer" }}
          onClick={() => onTabChange("my-tickets")}
        >
          TokTickIT
        </span>

        <button
          className="navbar-toggler text-white border-white"
          type="button"
          aria-controls="navbarNav"
          aria-expanded={navExpanded}
          aria-label="Toggle navigation"
          onClick={() => setNavExpanded(!navExpanded)}
        >
          <span className="navbar-toggler-icon" style={{ filter: "invert(1)" }}></span>
        </button>

        <div className={`collapse navbar-collapse ${navExpanded ? "show" : ""}`} id="navbarNav">
          <ul className="navbar-nav me-auto mb-2 mb-md-0 gap-1">
            <li className="nav-item">
              <button
                type="button"
                className={`nav-link btn btn-link text-decoration-none ${
                  activeTab === "my-tickets" ? "active" : ""
                }`}
                onClick={() => {
                  onTabChange("my-tickets");
                  setNavExpanded(false);
                }}
              >
                My Tickets
              </button>
            </li>
            <li className="nav-item">
              <button
                type="button"
                className={`nav-link btn btn-link text-decoration-none ${
                  activeTab === "create-ticket" ? "active" : ""
                }`}
                onClick={() => {
                  onTabChange("create-ticket");
                  setNavExpanded(false);
                }}
              >
                Create Ticket
              </button>
            </li>
          </ul>

          {selectedRequester && (
            <div className="d-flex flex-column flex-md-row align-items-md-center gap-2 mt-2 mt-md-0">
              <span className="zg-requester-chip" data-testid="requester-chip">
                <span>Signed in as <strong>{selectedRequester.name}</strong> <span className="opacity-75">(dev)</span></span>
              </span>
              <button
                type="button"
                className="btn btn-sm btn-outline-light"
                onClick={() => clearRequester()}
                data-testid="change-requester-btn"
              >
                Change Requester
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
