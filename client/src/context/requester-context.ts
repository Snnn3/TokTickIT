import { createContext } from "react";
import type { RequesterContextType } from "../types/requester";

export const STORAGE_KEY = "toktickit_selected_requester";

export const RequesterContext = createContext<RequesterContextType | undefined>(
  undefined
);
