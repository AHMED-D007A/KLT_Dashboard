"use client";

import { useState, useEffect } from "react";
import { RefreshCw, ChartArea, X, ExternalLink } from "lucide-react";
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
}

export function DashboardSidebar({
  selectedDashboard,
  onSelectDashboard,
  onDashboardDeleted,
}: DashboardSidebarProps) {
  const { isOpen } = useSidebar();
  const [dashboards, setDashboards] = useState<DashboardToken[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteDashboard = (dashboardId: string) => {
    // Remove from dashboards list
    setDashboards((prevDashboards) => {
      const updatedDashboards = prevDashboards.filter(
        (d) => d.id !== dashboardId
      );
      // Update localStorage with the filtered array
      localStorage.setItem("klt-dashboards", JSON.stringify(updatedDashboards));
      return updatedDashboards;
    });

    // Clean up dashboard data from the dashboard-specific localStorage entry
    try {
      const dashboardSpecificKey = `dashboard-storage-dashboard-${dashboardId}`;
      localStorage.removeItem(dashboardSpecificKey);
      console.log(`Cleaned up data for dashboard: ${dashboardId}`);
    } catch (error) {
      console.error('Failed to clean up dashboard data:', error);
    }

    // Notify parent component about the deletion
    onDashboardDeleted?.(dashboardId);
  };

  const openDashboardInNewTab = (dashboard: DashboardToken) => {
    // Create URL with dashboard ID as query parameter
    const url = new URL(window.location.href);
    url.searchParams.set('dashboard', dashboard.id);
    
    // Open in new tab
    window.open(url.toString(), '_blank');
  };

  const fetchDashboards = async () => {
    setLoading(true);
    setError(null);

    try {
      // Send 3 requests with 0.3 second delay between them
      for (let i = 0; i < 3; i++) {
        const response = await fetch("http://localhost:2345/dashboards");

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        // Update state and get the new value - prepend to beginning
        setDashboards((prevDashboards) => {
          const updatedDashboards = [data, ...prevDashboards];
          // Update localStorage with the actual new array
          localStorage.setItem("klt-dashboards", JSON.stringify(updatedDashboards));
          return updatedDashboards;
        });

        // Wait 0.3 seconds before the next request (except for the last one)
        if (i < 2) {
          await new Promise((resolve) => setTimeout(resolve, 300));
        }
      }
    } catch (error) {
      console.error("Failed to fetch dashboards:", error);
      // setError(
      //   error instanceof Error ? error.message : "Failed to fetch dashboards"
      // );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Load from localStorage first
    const savedDashboards = localStorage.getItem("klt-dashboards");
    if (savedDashboards) {
      try {
        const parsed = JSON.parse(savedDashboards);
        setDashboards(parsed);
      } catch (error) {
        console.error("Failed to parse saved dashboards:", error);
      }
    }
    fetchDashboards();
  }, []);

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2 w-full">
          <Button
            onClick={fetchDashboards}
            disabled={loading}
            variant="ghost"
            size="sm"
            className="p-2 rounded-md hover:bg-gray-100 w-full justify-start cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            {isOpen && (
              <h2 className="font-semibold text-lg ml-2">KLT Dashboards</h2>
            )}
          </Button>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <div className="space-y-2">
          {error && isOpen && (
            <div className="text-xs text-red-500 mt-1">
              {error}
            </div>
          )}

          {loading && (
            <div className={`text-sm text-gray-400 ${!isOpen && "sr-only"}`}>
              Loading...
            </div>
          )}

          {!loading && dashboards.length === 0 && !error && (
            <div className={`text-sm text-gray-500 ${!isOpen && "sr-only"}`}>
              No dashboards found
            </div>
          )}

          {dashboards.map((dashboard) => (
            <div
              key={dashboard.id}
              className={`
                w-full flex items-center gap-2 p-2 rounded-md transition-colors group
                ${
                  selectedDashboard?.id === dashboard.id
                    ? "bg-blue-100 text-blue-900"
                    : "hover:bg-gray-100"
                }
              `}
            >
              <button
                onClick={() => openDashboardInNewTab(dashboard)}
                className="flex items-center gap-2 flex-1 min-w-0 text-left"
                title={`Open ${dashboard.title} in new tab`}
              >
                <ChartArea className="h-4 w-4 flex-shrink-0" />
                {isOpen && (
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">
                      {dashboard.title}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {dashboard.id}
                    </div>
                  </div>
                )}
                {isOpen && (
                  <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400" />
                )}
              </button>
              {isOpen && (
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteDashboard(dashboard.id);
                  }}
                  variant="ghost"
                  size="sm"
                  className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0 hover:bg-red-100 hover:text-red-600 transition-opacity"
                  title={`Delete ${dashboard.title}`}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </SidebarContent>
    </Sidebar>
  );
}