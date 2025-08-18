"use client";

import { Shield, AreaChart, Rabbit } from "lucide-react";
import { DashboardToken } from "@/types/dashboard";
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

interface DashboardSidebarProps {
  selectedDashboard?: DashboardToken | null;
  onSelectDashboard: (dashboard: DashboardToken) => void;
  onDashboardDeleted?: (dashboardId: string) => void;
  currentView?: "dashboard" | "security";
  onViewChange?: (view: "dashboard" | "security") => void;
}

export function DashboardSidebar({
  selectedDashboard,
  currentView = "dashboard",
  onViewChange,
}: DashboardSidebarProps) {
  const { isOpen } = useSidebar();

  const handleViewChange = (view: "dashboard" | "security") => {
    onViewChange?.(view);
  };

  const hasSecurityReport = selectedDashboard?.security_report;

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2 w-full">
          <div className={`p-2 text-orange-900 h-full w-full flex items-center ${isOpen ? "ml-4" : "justify-center"}`}>
            <Rabbit className="h-4 w-4" />
            {isOpen && (
              <h2 className="font-semibold text-lg ml-2">KLT Dashboard</h2>
            )}
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <div className="space-y-2">
          {/* Dashboard View Button */}
          <Button
            onClick={() => handleViewChange("dashboard")}
            variant={currentView === "dashboard" ? "default" : "ghost"}
            className={`w-full ${isOpen ? "justify-start" : "justify-center"} gap-2 ${
              currentView === "dashboard"
                ? "bg-orange-100 text-orange-900 hover:bg-orange-200"
                : "text-orange-900 hover:bg-orange-100"
            }`}
          >
            <AreaChart className="h-4 w-4" />
            {isOpen && "Dashboard"}
          </Button>

          {/* Security Report Button */}
          <Button
            onClick={() => handleViewChange("security")}
            disabled={!hasSecurityReport}
            variant={currentView === "security" ? "default" : "ghost"}
            className={`w-full ${isOpen ? "justify-start" : "justify-center"} gap-2 ${
              currentView === "security"
                ? "bg-orange-100 text-orange-900 hover:bg-orange-200"
                : hasSecurityReport
                ? "text-orange-900 hover:bg-orange-100"
                : "text-orange-400 cursor-not-allowed"
            }`}
          >
            <Shield className="h-4 w-4" />
            {isOpen && (
              <span>
                Security Report
                {!hasSecurityReport && (
                  <span className="text-xs ml-1">(N/A)</span>
                )}
              </span>
            )}
          </Button>

          {/* Security Summary (when available and sidebar is open) */}
          {isOpen && hasSecurityReport && selectedDashboard?.security_report && (
            <div className="mt-4 p-3 bg-orange-50 rounded-md">
              <div className="text-xs font-medium text-orange-900 mb-2">
                Security Summary
              </div>
              <div className="space-y-1 text-xs text-orange-700">
                <div className="flex justify-between">
                  <span>Total Checks:</span>
                  <span className="font-medium">{selectedDashboard.security_report.total_checks}</span>
                </div>
                <div className="flex justify-between">
                  <span>Passed:</span>
                  <span className="font-medium text-green-600">{selectedDashboard.security_report.passed}</span>
                </div>
                <div className="flex justify-between">
                  <span>Failed:</span>
                  <span className="font-medium text-red-600">{selectedDashboard.security_report.failed}</span>
                </div>
                <div className="flex justify-between">
                  <span>Warnings:</span>
                  <span className="font-medium text-yellow-600">{selectedDashboard.security_report.warnings}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </SidebarContent>
    </Sidebar>
  );
}