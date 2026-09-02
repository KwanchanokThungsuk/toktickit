import { createContext, useContext, useState, ReactNode, useCallback } from "react";
import { Requester } from "../api";

const REQUESTER_STORAGE_KEY = "toktickit-selected-requester";

interface RequesterContextType {
  selectedRequester: Requester | null;
  setSelectedRequester: (requester: Requester | null) => void;
  clearSelectedRequester: () => void;
}

const RequesterContext = createContext<RequesterContextType | undefined>(undefined);

export interface RequesterProviderProps {
  children: ReactNode;
}

export function RequesterProvider({ children }: RequesterProviderProps) {
  const [selectedRequester, setSelectedRequesterState] = useState<Requester | null>(() => {
    const stored = localStorage.getItem(REQUESTER_STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return null;
      }
    }
    return null;
  });

  const setSelectedRequester = useCallback((requester: Requester | null) => {
    setSelectedRequesterState(requester);
    if (requester) {
      localStorage.setItem(REQUESTER_STORAGE_KEY, JSON.stringify(requester));
    } else {
      localStorage.removeItem(REQUESTER_STORAGE_KEY);
    }
  }, []);

  const clearSelectedRequester = useCallback(() => {
    setSelectedRequester(null);
  }, [setSelectedRequester]);

  const value: RequesterContextType = {
    selectedRequester,
    setSelectedRequester,
    clearSelectedRequester,
  };

  return (
    <RequesterContext.Provider value={value}>
      {children}
    </RequesterContext.Provider>
  );
}

export function useRequester() {
  const context = useContext(RequesterContext);
  if (!context) {
    throw new Error("useRequester must be used within a RequesterProvider");
  }
  return context;
}