import { useContext } from "react";
import type { RequesterContextType } from "../types/requester";
import { RequesterContext } from "./requester-context";

export function useRequester(): RequesterContextType {
  const context = useContext(RequesterContext);
  if (!context) {
    throw new Error("useRequester must be used within a RequesterProvider");
  }
  return context;
}
