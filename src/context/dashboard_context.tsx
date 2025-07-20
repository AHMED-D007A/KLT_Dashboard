"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import { DashboardToken } from "@/types/dashboard";

interface DashboardContextType {
  selectedDashboard: DashboardToken | null;
  setSelectedDashboard: (dashboard: DashboardToken | null) => void;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [selectedDashboard, setSelectedDashboard] = useState<DashboardToken | null>(null);

  return (
    <DashboardContext.Provider value={{ selectedDashboard, setSelectedDashboard }}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (context === undefined) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
}