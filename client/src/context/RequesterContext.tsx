import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";
import type { RequesterUser, RequesterContextType } from "../types/requester";

const STORAGE_KEY = "toktickit_selected_requester";

const RequesterContext = createContext<RequesterContextType | undefined>(undefined);

export function RequesterProvider({ children }: { children: ReactNode }) {
  const [selectedRequester, setSelectedRequesterState] = useState<RequesterUser | null>(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const selectRequester = (requester: RequesterUser) => {
    setSelectedRequesterState(requester);
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(requester));
    } catch {
      // ignore storage errors
    }
  };

  const clearRequester = () => {
    setSelectedRequesterState(null);
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore storage errors
    }
  };

  return (
    <RequesterContext.Provider
      value={{
        selectedRequester,
        selectRequester,
        clearRequester,
      }}
    >
      {children}
    </RequesterContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useRequester(): RequesterContextType {
  const context = useContext(RequesterContext);
  if (!context) {
    throw new Error("useRequester must be used within a RequesterProvider");
  }
  return context;
}
