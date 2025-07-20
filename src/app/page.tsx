"use client";

import { useState, useEffect, useRef } from "react";
import {
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/dashboard_sidebar";
import { SectionCards } from "@/components/section_cards";
import { DashboardProvider, useDashboard } from "@/context/dashboard_context";
import { VUReport, vuReportSchema } from "@/types/dashboard";
import { DataTable } from "@/components/data_table";

type ChartHistory = {
  overall: Array<{ timestamp: number; avg_latency: number }>;
  perStep: Record<string, Array<{ timestamp: number; value: number }>>;
  perVU: Record<string, Array<{ timestamp: number; value: number }>>;
};

type DashboardStorage = {
  dashboardData: Record<string, VUReport[]>;
  chartHistories: Record<string, ChartHistory>;
  dashboardStopTimes: Record<string, string>;
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

  const dashboardKey = selectedDashboard?.id || "";
  const lastGoodData = dashboardData[dashboardKey] || [];

  // Always up-to-date refs for calculations
  const dashboardDataRef = useRef(dashboardData);
  const chartHistoriesRef = useRef(chartHistories);
  const dashboardStopTimesRef = useRef(dashboardStopTimes);

  useEffect(() => {
    dashboardDataRef.current = dashboardData;
  }, [dashboardData]);

  useEffect(() => {
    chartHistoriesRef.current = chartHistories;
  }, [chartHistories]);

  useEffect(() => {
    dashboardStopTimesRef.current = dashboardStopTimes;
  }, [dashboardStopTimes]);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("dashboard-storage");
      if (stored) {
        const data: DashboardStorage = JSON.parse(stored);
        setDashboardData(data.dashboardData || {});
        setChartHistories(data.chartHistories || {});
        setDashboardStopTimes(data.dashboardStopTimes || {});
      }
    } catch (error) {
      console.error("Failed to load from localStorage:", error);
    }
  }, []);

  // Save to localStorage whenever data changes
  useEffect(() => {
    try {
      const dataToStore: DashboardStorage = {
        dashboardData,
        chartHistories,
        dashboardStopTimes,
      };
      localStorage.setItem("dashboard-storage", JSON.stringify(dataToStore));
    } catch (error) {
      console.error("Failed to save to localStorage:", error);
    }
  }, [dashboardData, chartHistories, dashboardStopTimes]);

  // In your page.tsx - replace the fetchVUData function
  const fetchVUData = async (url: string): Promise<VUReport[]> => {
    if (!url) return [];
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) throw new Error("Failed to fetch");
      const json = await response.json();

      console.log(`Raw API data for ${url}:`, json);

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
          console.log(`Valid VU ${result.data.vu_id} at index ${index}`);
        } else {
          invalidData.push({
            index,
            item: { vu_id: item.vu_id },
            reason: "Schema validation failed",
            errors: result.error.issues,
          });
        }
      });

      console.log(`Validation summary for ${url}:`);
      console.log(`- Raw items: ${json.length}`);
      console.log(`- Valid VUs: ${validatedData.length}`);
      console.log(`- Invalid items: ${invalidData.length}`);

      if (invalidData.length > 0) {
        console.log("Invalid data details:", invalidData);
      }

      // Log VU IDs to check for missing ones
      const vuIds = validatedData.map((vu) => vu.vu_id).sort((a, b) => a - b);
      console.log(`Valid VU IDs: [${vuIds.join(", ")}]`);

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
      console.log(`Dashboard ${dashboardKey} is already stopped. Not polling.`);
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
        console.log(`Dashboard ${dashboardKey} was stopped during polling.`);
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
              `No valid VU data received. Fail count: ${failCount}/${MAX_FAILS}`
            );
          }
        }
      } catch (error) {
        console.error("Error fetching VU data:", error);
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
            const h = Math.floor(diff / 3600);
            const m = Math.floor((diff % 3600) / 60);
            const s = diff % 60;
            elapsed =
              h > 0 ? `${h}h ${m}m ${s}s` : m > 0 ? `${m}m ${s}s` : `${s}s`;
          }

          setDashboardStopTimes((prev) => ({
            ...prev,
            [dashboardKey]: elapsed,
          }));

          console.log(
            `Dashboard ${dashboardKey} stopped after ${MAX_FAILS} failures. Final time: ${elapsed}`
          );
        }

        console.warn(
          `Stopped polling for dashboard ${dashboardKey} due to repeated fetch failures.`
        );
      }
    };

    // Start fetching
    console.log(`Starting data polling for dashboard: ${dashboardKey}`);
    getData();
    interval = setInterval(getData, 1000);

    return () => {
      isMounted = false;
      if (interval) {
        clearInterval(interval);
        console.log(`Stopped polling for dashboard: ${dashboardKey}`);
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

    // If the deleted dashboard was selected, clear the selection
    if (selectedDashboard?.id === deletedDashboardId) {
      setSelectedDashboard(null);
    }

    console.log(`Removed dashboard ${deletedDashboardId} from component state`);
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
          <SidebarTrigger />
          <h1 className="text-lg font-semibold">
            {selectedDashboard ? selectedDashboard.title : "Select a Dashboard"}
          </h1>
          {/* Debug info */}
          {selectedDashboard && (
            <span className="text-xs text-gray-500 ml-auto">
              VUs: {currentVUCount} | Status:{" "}
              {dashboardStopTimes[dashboardKey] ? "Completed" : "Running"}
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

            {/* Placeholder for future components */}
            {selectedDashboard && (
                <div className="bg-white rounded-lg border p-8 text-center text-gray-500">
                  ChartAreaInteractive will go here
                  <div className="text-xs mt-2">
                    Current VU Count: {lastGoodData.length} | Dashboard Key:{" "}
                    {dashboardKey} | Stop Time:{" "}
                    {dashboardStopTimes[dashboardKey] || "None"}
                  </div>
                </div>
            )}
            <DataTable data={lastGoodData} />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

export default function HomePage() {
  return (
    <DashboardProvider>
      <DashboardContent />
    </DashboardProvider>
  );
}
