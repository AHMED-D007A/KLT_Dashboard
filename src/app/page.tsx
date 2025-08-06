"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar";
import { VUReport, vuReportSchema, DashboardToken } from "@/types/dashboard";
import { DashboardSidebar } from "@/components/dashboard_sidebar";
import { DashboardProvider, useDashboard } from "@/context/dashboard_context";
import { SectionCards } from "@/components/section_cards";
import { DataTable } from "@/components/data_table";
import { ChartAreaInteractive } from "@/components/chart_area_interactive";

type ChartHistory = {
  overall: Array<{ timestamp: number; avg_latency: number }>;
  perStep: Record<string, Array<{ timestamp: number; value: number }>>;
  perVU: Record<string, Array<{ timestamp: number; value: number }>>;
};

type DashboardStorage = {
  dashboardData: Record<string, VUReport[]>;
  chartHistories: Record<string, ChartHistory>;
  dashboardStopTimes: Record<string, string>;
  dashboardCloseTimes: Record<string, string>;
};

function DashboardContent() {
  const { selectedDashboard, setSelectedDashboard } = useDashboard();

  // Store data for all dashboards (client-side only)
  const [dashboardData, setDashboardData] = useState<
    Record<string, VUReport[]>
  >({});
  const [chartHistories, setChartHistories] = useState<
    Record<string, ChartHistory>
  >({});
  const [dashboardStopTimes, setDashboardStopTimes] = useState<
    Record<string, string>
  >({});
  const [dashboardCloseTimes, setDashboardCloseTimes] = useState<
    Record<string, string>
  >({});

  const dashboardKey = selectedDashboard?.id || "";
  const lastGoodData = dashboardData[dashboardKey] || [];

  // Chart history for current dashboard
  const chartHistory = chartHistories[dashboardKey] || {
    overall: [],
    perStep: {},
    perVU: {},
  };

  const setChartHistory = (updater: (prev: ChartHistory) => ChartHistory) => {
    setChartHistories((prev) => ({
      ...prev,
      [dashboardKey]: updater(
        prev[dashboardKey] || { overall: [], perStep: {}, perVU: {} }
      ),
    }));
  };

  // Always up-to-date refs for calculations
  const dashboardDataRef = useRef(dashboardData);
  const chartHistoriesRef = useRef(chartHistories);
  const dashboardStopTimesRef = useRef(dashboardStopTimes);
  const dashboardCloseTimesRef = useRef(dashboardCloseTimes);

  useEffect(() => {
    dashboardDataRef.current = dashboardData;
  }, [dashboardData]);

  useEffect(() => {
    chartHistoriesRef.current = chartHistories;
  }, [chartHistories]);

  useEffect(() => {
    dashboardStopTimesRef.current = dashboardStopTimes;
  }, [dashboardStopTimes]);

  useEffect(() => {
    dashboardCloseTimesRef.current = dashboardCloseTimes;
  }, [dashboardCloseTimes]);

  // Helper function to get dashboard-specific localStorage key
  const getDashboardSpecificKey = (baseKey: string, dashboardId: string) =>
    `${baseKey}-dashboard-${dashboardId}`;

  // Helper function to parse duration string to seconds
  const parseDurationToSeconds = (duration: string): number => {
    const match = duration.match(/(\d+)([smh])/);
    if (!match) return 0;

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case "s":
        return value;
      case "m":
        return value * 60;
      case "h":
        return value * 3600;
      default:
        return 0;
    }
  };

  // Helper function to format seconds to duration string
  const formatSecondsToDuration = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return h > 0 ? `${h}h ${m}m ${s}s` : m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  // Load from localStorage on mount using dashboard-specific key
  useEffect(() => {
    if (!selectedDashboard?.id) return;

    try {
      const dashboardSpecificKey = getDashboardSpecificKey(
        "dashboard-storage",
        selectedDashboard.id
      );
      const stored = localStorage.getItem(dashboardSpecificKey);
      if (stored) {
        const data: DashboardStorage = JSON.parse(stored);
        setDashboardData(data.dashboardData || {});
        setChartHistories(data.chartHistories || {});
        setDashboardStopTimes(data.dashboardStopTimes || {});
        setDashboardCloseTimes(data.dashboardCloseTimes || {}); // Load close times
        console.log(`Loaded data for dashboard: ${selectedDashboard.id}`);
      }
    } catch (error) {
      console.error("Failed to load from localStorage:", error);
    }
  }, [selectedDashboard?.id]);

  // Check if server is still live by attempting a health check
  const checkServerHealth = async (url: string): Promise<boolean> => {
    try {
      const response = await fetch(url, { 
        cache: "no-store",
        signal: AbortSignal.timeout(3000) // 3 second timeout
      });
      return response.ok;
    } catch (error) {
      console.log(`Server health check failed for ${url}:`, error);
      return false;
    }
  };

  // Check if dashboard should be marked as completed based on server availability
  useEffect(() => {
    if (
      !selectedDashboard?.id ||
      !selectedDashboard?.created_at ||
      !selectedDashboard?.url
    )
      return;

    const dashboardKey = selectedDashboard.id;

    // Only check if dashboard is not already stopped and has a close time
    if (
      dashboardStopTimes[dashboardKey] &&
      dashboardStopTimes[dashboardKey] !== "0s"
    ) {
      return; // Already stopped
    }

    if (dashboardCloseTimes[dashboardKey]) {
      // Check server health to determine if we should use saved close time
      const checkAndUpdateStatus = async () => {
        const isServerLive = await checkServerHealth(selectedDashboard.url);
        
        if (!isServerLive) {
          // Server is not responding, use the saved close time as final time
          const savedCloseTime = dashboardCloseTimes[dashboardKey];
          setDashboardStopTimes((prev) => ({
            ...prev,
            [dashboardKey]: savedCloseTime,
          }));

          // Clear the close time since we've now marked it as completed
          setDashboardCloseTimes((prev) => {
            const updated = { ...prev };
            delete updated[dashboardKey];
            return updated;
          });

          console.log(
            `Dashboard ${dashboardKey} marked as completed (server offline) with saved close time: ${savedCloseTime}`
          );
        } else {
          console.log(
            `Dashboard ${dashboardKey} server is still live, continuing to update elapsed time`
          );
        }
      };

      // Check server health immediately and then every 10 seconds
      checkAndUpdateStatus();
      const healthCheckInterval = setInterval(checkAndUpdateStatus, 10000);

      return () => clearInterval(healthCheckInterval);
    }
  }, [selectedDashboard, dashboardStopTimes, dashboardCloseTimes]);

  // Save to localStorage whenever data changes using dashboard-specific key
  useEffect(() => {
    if (!selectedDashboard?.id) return;

    try {
      const dataToStore: DashboardStorage = {
        dashboardData,
        chartHistories,
        dashboardStopTimes,
        dashboardCloseTimes, // Include close times in storage
      };
      const dashboardSpecificKey = getDashboardSpecificKey(
        "dashboard-storage",
        selectedDashboard.id
      );
      localStorage.setItem(dashboardSpecificKey, JSON.stringify(dataToStore));
    } catch (error) {
      console.error("Failed to save to localStorage:", error);
    }
  }, [
    dashboardData,
    chartHistories,
    dashboardStopTimes,
    dashboardCloseTimes,
    selectedDashboard?.id,
  ]);

  // Handle browser tab close/refresh to save elapsed time
  useEffect(() => {
    if (!selectedDashboard?.id || !selectedDashboard?.created_at) return;

    const handleBeforeUnload = () => {
      // Only save close time if dashboard is not already stopped
      const currentStopTime =
        dashboardStopTimesRef.current[selectedDashboard.id];
      if (currentStopTime && currentStopTime !== "0s") {
        return; // Already stopped, don't save close time
      }

      try {
        const start = new Date(selectedDashboard.created_at).getTime();
        const now = Date.now();
        const elapsedSeconds = Math.max(0, Math.floor((now - start) / 1000));
        const elapsedString = formatSecondsToDuration(elapsedSeconds);

        // Save the elapsed time at close
        setDashboardCloseTimes((prev) => ({
          ...prev,
          [selectedDashboard.id]: elapsedString,
        }));

        // Also save directly to localStorage since state might not update in time
        const dashboardSpecificKey = getDashboardSpecificKey(
          "dashboard-storage",
          selectedDashboard.id
        );
        const currentStorage = localStorage.getItem(dashboardSpecificKey);
        if (currentStorage) {
          const data: DashboardStorage = JSON.parse(currentStorage);
          data.dashboardCloseTimes = {
            ...data.dashboardCloseTimes,
            [selectedDashboard.id]: elapsedString,
          };
          localStorage.setItem(dashboardSpecificKey, JSON.stringify(data));
        }

        console.log(
          `Saved close time for dashboard ${selectedDashboard.id}: ${elapsedString}`
        );
      } catch (error) {
        console.error("Failed to save close time on unload:", error);
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [selectedDashboard?.id, selectedDashboard?.created_at]);

  // In your page.tsx - replace the fetchVUData function
  const fetchVUData = async (url: string): Promise<VUReport[]> => {
    if (!url) return [];
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) throw new Error("Failed to fetch");
      const json = await response.json();

      console.log(
        `Raw API data for ${url} (Dashboard: ${selectedDashboard?.id}):`,
        json
      );

      if (!Array.isArray(json)) {
        console.warn("API returned non-array data:", typeof json);
        return [];
      }

      const validatedData: VUReport[] = [];
      const invalidData: any[] = [];

      json.forEach((item, index) => {
        // Check if item exists and has vu_id
        if (!item || typeof item.vu_id !== "number") {
          invalidData.push({ index, item, reason: "Missing or invalid vu_id" });
          return;
        }

        // Validate with zod schema
        const result = vuReportSchema.safeParse(item);
        if (result.success) {
          validatedData.push(result.data);
          console.log(
            `Valid VU ${result.data.vu_id} at index ${index} (Dashboard: ${selectedDashboard?.id})`
          );
        } else {
          invalidData.push({
            index,
            item: { vu_id: item.vu_id },
            reason: "Schema validation failed",
            errors: result.error.issues,
          });
        }
      });

      console.log(
        `Validation summary for ${url} (Dashboard: ${selectedDashboard?.id}):`
      );
      console.log(`- Raw items: ${json.length}`);
      console.log(`- Valid VUs: ${validatedData.length}`);
      console.log(`- Invalid items: ${invalidData.length}`);

      if (invalidData.length > 0) {
        console.log("Invalid data details:", invalidData);
      }

      // Log VU IDs to check for missing ones
      const vuIds = validatedData.map((vu) => vu.vu_id).sort((a, b) => a - b);
      console.log(
        `Valid VU IDs: [${vuIds.join(", ")}] (Dashboard: ${
          selectedDashboard?.id
        })`
      );

      return validatedData;
    } catch (error) {
      console.error("Failed to fetch VU data:", error);
      return [];
    }
  };

  // Main data fetching effect
  useEffect(() => {
    if (!selectedDashboard?.url) return;

    // Check if already stopped
    const isStopped =
      dashboardStopTimes[dashboardKey] &&
      dashboardStopTimes[dashboardKey] !== "0s";
    if (isStopped) {
      console.log(
        `Dashboard ${dashboardKey} is already stopped. Not polling. (Dashboard: ${selectedDashboard?.id})`
      );
      return;
    }

    let isMounted = true;
    let interval: NodeJS.Timeout;
    let failCount = 0;
    const MAX_FAILS = 3;

    const getData = async () => {
      // Re-check stopped state on each call
      const currentStopTime = dashboardStopTimesRef.current[dashboardKey];
      if (currentStopTime && currentStopTime !== "0s") {
        console.log(
          `Dashboard ${dashboardKey} was stopped during polling. (Dashboard: ${selectedDashboard?.id})`
        );
        clearInterval(interval);
        return;
      }

      try {
        const data = await fetchVUData(selectedDashboard.url);
        if (isMounted) {
          if (Array.isArray(data) && data.length > 0) {
            setDashboardData((prev) => ({
              ...prev,
              [dashboardKey]: data,
            }));
            failCount = 0;
          } else {
            failCount++;
            console.warn(
              `No valid VU data received. Fail count: ${failCount}/${MAX_FAILS} (Dashboard: ${selectedDashboard?.id})`
            );
          }
        }
      } catch (error) {
        console.error(
          `Error fetching VU data (Dashboard: ${selectedDashboard?.id}):`,
          error
        );
        failCount++;
      }

      // Stop polling after MAX_FAILS
      if (failCount >= MAX_FAILS && interval) {
        clearInterval(interval);

        if (!dashboardStopTimesRef.current[dashboardKey]) {
          // Calculate elapsed time when stopped
          let elapsed = "0s";
          if (selectedDashboard?.created_at) {
            const start = new Date(selectedDashboard.created_at).getTime();
            const now = Date.now();
            const diff = Math.max(0, Math.floor((now - start) / 1000));
            elapsed = formatSecondsToDuration(diff);
          }

          setDashboardStopTimes((prev) => ({
            ...prev,
            [dashboardKey]: elapsed,
          }));

          console.log(
            `Dashboard ${dashboardKey} stopped after ${MAX_FAILS} failures. Final time: ${elapsed} (Dashboard: ${selectedDashboard?.id})`
          );
        }

        console.warn(
          `Stopped polling for dashboard ${dashboardKey} due to repeated fetch failures. (Dashboard: ${selectedDashboard?.id})`
        );
      }
    };

    // Start fetching
    console.log(
      `Starting data polling for dashboard: ${dashboardKey} (Dashboard: ${selectedDashboard?.id})`
    );
    getData();
    interval = setInterval(getData, 1000);

    return () => {
      isMounted = false;
      if (interval) {
        clearInterval(interval);
        console.log(
          `Stopped polling for dashboard: ${dashboardKey} (Dashboard: ${selectedDashboard?.id})`
        );
      }
    };
  }, [selectedDashboard, dashboardKey]);

  // Handle dashboard deletion
  const handleDashboardDeleted = (deletedDashboardId: string) => {
    // Update local state to remove the deleted dashboard data
    setDashboardData((prev) => {
      const updated = { ...prev };
      delete updated[deletedDashboardId];
      return updated;
    });

    setChartHistories((prev) => {
      const updated = { ...prev };
      delete updated[deletedDashboardId];
      return updated;
    });

    setDashboardStopTimes((prev) => {
      const updated = { ...prev };
      delete updated[deletedDashboardId];
      return updated;
    });

    setDashboardCloseTimes((prev) => {
      const updated = { ...prev };
      delete updated[deletedDashboardId];
      return updated;
    }); // Also clean up close times

    // If the deleted dashboard was selected, clear the selection
    if (selectedDashboard?.id === deletedDashboardId) {
      setSelectedDashboard(null);
    }

    console.log(
      `Removed dashboard ${deletedDashboardId} from component state (Dashboard: ${selectedDashboard?.id})`
    );
  };

  const currentVUCount = lastGoodData.length;

  return (
    <SidebarProvider>
      <DashboardSidebar
        selectedDashboard={selectedDashboard}
        onSelectDashboard={setSelectedDashboard}
        onDashboardDeleted={handleDashboardDeleted}
      />

      <SidebarInset>
        {/* Header */}
        <header className="flex h-12 items-center gap-2 border-b px-4">
          <SidebarTrigger className="text-orange-900" />
          <h1 className="text-lg font-semibold text-orange-900">
            {selectedDashboard ? selectedDashboard.title : "Select a Dashboard"}
          </h1>
          {/* Debug info */}
          {selectedDashboard && (
            <span className="text-xs text-orange-500 ml-auto">
              Dashboard: {selectedDashboard.id}
            </span>
          )}
        </header>

        {/* Main Content */}
        <div className="p-6">
          <div className="@container/main flex flex-col gap-4 md:gap-6">
            <SectionCards
              lttoken={selectedDashboard ?? undefined}
              stopped={
                !!(
                  dashboardStopTimes[dashboardKey] &&
                  dashboardStopTimes[dashboardKey] !== "0s"
                )
              }
              stopTime={dashboardStopTimes[dashboardKey]}
              currentVUCount={currentVUCount}
            />

            <ChartAreaInteractive
              vuData={lastGoodData}
              chartHistory={chartHistory}
              setChartHistory={setChartHistory}
            />
            <DataTable data={lastGoodData} />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

// Separate component to handle search params
function DashboardWithSearchParams() {
  const { selectedDashboard, setSelectedDashboard } = useDashboard();
  const searchParams = useSearchParams();

  // Load dashboard from URL parameter
  useEffect(() => {
    const dashboardId = searchParams?.get("dashboard");
    if (dashboardId && !selectedDashboard) {
      // Load dashboards from localStorage to find the selected one
      const savedDashboards = localStorage.getItem("klt-dashboards");
      if (savedDashboards) {
        try {
          const parsed: DashboardToken[] = JSON.parse(savedDashboards);
          const dashboard = parsed.find((d) => d.id === dashboardId);
          if (dashboard) {
            setSelectedDashboard(dashboard);
          }
        } catch (error) {
          console.error("Failed to parse saved dashboards:", error);
        }
      }
    }
  }, [searchParams, selectedDashboard, setSelectedDashboard]);

  return <DashboardContent />;
}

export default function HomePage() {
  return (
    <DashboardProvider>
      <Suspense
        fallback={
          <div className="flex h-screen items-center justify-center">
            <div className="text-orange-900">Loading dashboard...</div>
          </div>
        }
      >
        <DashboardWithSearchParams />
      </Suspense>
    </DashboardProvider>
  );
}
