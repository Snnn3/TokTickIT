import { useState } from "react";
import type { ReactNode } from "react";
import type { RequesterUser } from "../types/requester";
import { RequesterContext, STORAGE_KEY } from "./requester-context";

export { useRequester } from "./useRequester";

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

