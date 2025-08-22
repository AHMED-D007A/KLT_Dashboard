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
import { SecurityReportView } from "@/components/security_report_view";
import { DashboardListPage } from "../components/dashboard_list_page";

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
  dashboardOpenedStatus: Record<string, boolean>;
};

function DashboardContent() {
  const { selectedDashboard, setSelectedDashboard } = useDashboard();
  const [currentView, setCurrentView] = useState<"dashboard" | "security">("dashboard");

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
  const [dashboardOpenedStatus, setDashboardOpenedStatus] = useState<
    Record<string, boolean>
  >({});

  const [localStorageLoaded, setLocalStorageLoaded] = useState(false);

  const dashboardKey = selectedDashboard?.id || "";
  const lastGoodData = dashboardData[dashboardKey] || [];

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
  const dashboardOpenedStatusRef = useRef(dashboardOpenedStatus);

  // Consolidated ref updates
  useEffect(() => {
    dashboardDataRef.current = dashboardData;
    chartHistoriesRef.current = chartHistories;
    dashboardStopTimesRef.current = dashboardStopTimes;
    dashboardCloseTimesRef.current = dashboardCloseTimes;
    dashboardOpenedStatusRef.current = dashboardOpenedStatus;
  }, [dashboardData, chartHistories, dashboardStopTimes, dashboardCloseTimes, dashboardOpenedStatus]);

  const getDashboardSpecificKey = (baseKey: string, dashboardId: string) =>
    `${baseKey}-dashboard-${dashboardId}`;

  const formatSecondsToDuration = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return h > 0 ? `${h}h ${m}m ${s}s` : m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  // Utility function to calculate elapsed time
  const calculateElapsedTime = (startTime: string): string => {
    const start = new Date(startTime).getTime();
    const now = Date.now();
    const elapsedSeconds = Math.max(0, Math.floor((now - start) / 1000));
    return formatSecondsToDuration(elapsedSeconds);
  };

  // Utility function to save dashboard storage
  const saveDashboardStorage = () => {
    if (!selectedDashboard?.id) return;

    try {
      const dataToStore: DashboardStorage = {
        dashboardData,
        chartHistories,
        dashboardStopTimes,
        dashboardCloseTimes,
        dashboardOpenedStatus,
      };
      const dashboardSpecificKey = getDashboardSpecificKey(
        "dashboard-storage",
        selectedDashboard.id
      );
      localStorage.setItem(dashboardSpecificKey, JSON.stringify(dataToStore));
    } catch (error) {
      // Silently handle localStorage errors
    }
  };

  // Utility function to load dashboard storage
  const loadDashboardStorage = () => {
    if (!selectedDashboard?.id) {
      setLocalStorageLoaded(false);
      return;
    }

    try {
      const dashboardSpecificKey = getDashboardSpecificKey(
        "dashboard-storage",
        selectedDashboard.id
      );
      const stored = localStorage.getItem(dashboardSpecificKey);
      if (stored) {
        const data: DashboardStorage = JSON.parse(stored);
        setDashboardData((prev) => ({ ...prev, ...data.dashboardData }));
        setChartHistories((prev) => ({ ...prev, ...data.chartHistories }));
        setDashboardStopTimes((prev) => ({ ...prev, ...data.dashboardStopTimes }));
        setDashboardCloseTimes((prev) => ({ ...prev, ...data.dashboardCloseTimes }));
        setDashboardOpenedStatus((prev) => ({ ...prev, ...data.dashboardOpenedStatus }));
      }
    } catch (error) {
      // Silently handle localStorage errors
    } finally {
      setLocalStorageLoaded(true);
    }
  };

  // Utility function to remove dashboard data
  const removeDashboardData = (dashboardId: string) => {
    setDashboardData((prev) => {
      const updated = { ...prev };
      delete updated[dashboardId];
      return updated;
    });

    setChartHistories((prev) => {
      const updated = { ...prev };
      delete updated[dashboardId];
      return updated;
    });

    setDashboardStopTimes((prev) => {
      const updated = { ...prev };
      delete updated[dashboardId];
      return updated;
    });

    setDashboardCloseTimes((prev) => {
      const updated = { ...prev };
      delete updated[dashboardId];
      return updated;
    });

    setDashboardOpenedStatus((prev) => {
      const updated = { ...prev };
      delete updated[dashboardId];
      return updated;
    });
  };

  // Utility function to set dashboard as stopped
  const setDashboardStopped = (dashboardId: string, elapsed: string) => {
    setDashboardStopTimes((prev) => ({
      ...prev,
      [dashboardId]: elapsed,
    }));
  };

  useEffect(() => {
    loadDashboardStorage();
  }, [selectedDashboard?.id]);

  useEffect(() => {
    if (!selectedDashboard?.id || !localStorageLoaded) return;

    const dashboardKey = selectedDashboard.id;
    
    if (!dashboardOpenedStatus[dashboardKey]) {
      setDashboardOpenedStatus((prev) => ({
        ...prev,
        [dashboardKey]: true,
      }));
      
      checkServerHealth(selectedDashboard.url).then((isServerLive) => {
        if (!isServerLive) {
          // Server is dead - check if we have a close time from previous session
          const savedCloseTime = dashboardCloseTimes[dashboardKey];
          if (savedCloseTime) {
            // Use the close time from previous session
            setDashboardStopped(dashboardKey, savedCloseTime);
          } else {
            // No close time, calculate from created_at
            setDashboardStopped(dashboardKey, "0s");
          }
          
          // Clean up close time after using it
          setDashboardCloseTimes((prev) => {
            const updated = { ...prev };
            delete updated[dashboardKey];
            return updated;
          });
        } else {
          // Server is alive - clean up any stale close time from previous session
          setDashboardCloseTimes((prev) => {
            const updated = { ...prev };
            delete updated[dashboardKey];
            return updated;
          });
        }
      });
    }
  }, [selectedDashboard?.id, dashboardOpenedStatus, selectedDashboard?.url, localStorageLoaded]);

  const checkServerHealth = async (url: string, retries: number = 0): Promise<boolean> => {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        // Add delay if service worker was recently unregistered
        if (attempt === 0 && typeof window !== 'undefined') {
          const swUnregistered = sessionStorage.getItem('sw-unregistered');
          if (swUnregistered && Date.now() - parseInt(swUnregistered) < 3000) {
            await new Promise(resolve => setTimeout(resolve, 300));
          }
        }

        const response = await fetch(url, { 
          cache: "no-store",
          signal: AbortSignal.timeout(2000 + attempt * 500)
        });
        
        if (response.ok) return true;
        if (response.status >= 400 && response.status < 500) return false;
        
      } catch (error) {
        if (attempt === retries) return false;
        await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));
      }
    }
    return false;
  };

  useEffect(() => {
    if (
      !selectedDashboard?.id ||
      !selectedDashboard?.created_at ||
      !selectedDashboard?.url ||
      !localStorageLoaded
    )
      return;

    const dashboardKey = selectedDashboard.id;

    if (dashboardStopTimes[dashboardKey]) return;

    if (dashboardCloseTimes[dashboardKey] && dashboardOpenedStatus[dashboardKey]) {
      // This handles navigation within the same session
      const checkServerAndHandleTiming = async () => {
        const isServerLive = await checkServerHealth(selectedDashboard.url);
        
        if (!isServerLive) {
          const savedCloseTime = dashboardCloseTimes[dashboardKey];
          setDashboardStopped(dashboardKey, savedCloseTime);
          
          // Only clean up close time after using it for stopped state
          setDashboardCloseTimes((prev) => {
            const updated = { ...prev };
            delete updated[dashboardKey];
            return updated;
          });
        }
        // If server is still live, keep the close time for future use
      };

      checkServerAndHandleTiming();
    } else if (dashboardOpenedStatus[dashboardKey]) {
      // This handles the normal case where dashboard is already opened in this session
      const healthCheckInterval = setInterval(async () => {
        const isServerLive = await checkServerHealth(selectedDashboard.url);
        if (!isServerLive && !dashboardStopTimes[dashboardKey]) {
          // Use saved close time if available (from navigation within session)
          const savedCloseTime = dashboardCloseTimes[dashboardKey];
          const elapsedString = savedCloseTime || calculateElapsedTime(selectedDashboard.created_at);
          setDashboardStopped(dashboardKey, elapsedString);
          
          // If we used a close time, clean it up
          if (savedCloseTime) {
            setDashboardCloseTimes((prev) => {
              const updated = { ...prev };
              delete updated[dashboardKey];
              return updated;
            });
          }
        }
      }, 10000);

      return () => clearInterval(healthCheckInterval);
    }
    // If dashboard is not opened in this session, the first effect will handle it
  }, [selectedDashboard, dashboardStopTimes, dashboardCloseTimes, dashboardOpenedStatus, localStorageLoaded]);

  // Track navigation away from dashboards to save close time
  const prevDashboardRef = useRef<DashboardToken | null>(null);
  
  useEffect(() => {
    const prevDashboard = prevDashboardRef.current;
    
    // If we had a previous dashboard and now have a different one (or null), save close time for the previous one
    if (prevDashboard?.id && 
        prevDashboard.id !== selectedDashboard?.id && 
        localStorageLoaded) {
      
      const prevDashboardKey = prevDashboard.id;
      const currentStopTime = dashboardStopTimesRef.current[prevDashboardKey];
      
      // Only save close time if dashboard is not already stopped
      if (!currentStopTime) {
        try {
          const elapsedString = calculateElapsedTime(prevDashboard.created_at);
          
          // Update the close times state
          setDashboardCloseTimes((prev) => ({
            ...prev,
            [prevDashboardKey]: elapsedString,
          }));

          // Also save directly to localStorage for immediate persistence
          const dashboardSpecificKey = getDashboardSpecificKey(
            "dashboard-storage",
            prevDashboardKey
          );
          const currentStorage = localStorage.getItem(dashboardSpecificKey);
          if (currentStorage) {
            const data: DashboardStorage = JSON.parse(currentStorage);
            data.dashboardCloseTimes = {
              ...data.dashboardCloseTimes,
              [prevDashboardKey]: elapsedString,
            };
            localStorage.setItem(dashboardSpecificKey, JSON.stringify(data));
          }
        } catch (error) {
          // Silently handle localStorage errors
        }
      }
    }
    
    // Update the ref with current dashboard
    prevDashboardRef.current = selectedDashboard;
  }, [selectedDashboard?.id, localStorageLoaded]);

  // Periodically check dashboards with close times to see if their servers have stopped
  useEffect(() => {
    if (!localStorageLoaded) return;
    
    // Only run if there are close times to check
    const closeTimeEntries = Object.entries(dashboardCloseTimes);
    if (closeTimeEntries.length === 0) return;

    const checkDashboardsWithCloseTimes = async () => {      
      for (const [dashboardId, closeTime] of closeTimeEntries) {
        // Skip if already stopped, currently being viewed, or not opened in this session
        if (dashboardStopTimes[dashboardId] || 
            selectedDashboard?.id === dashboardId ||
            !dashboardOpenedStatus[dashboardId]) {
          continue;
        }

        // Try to find the dashboard URL from localStorage
        const dashboards = JSON.parse(localStorage.getItem("klt-dashboards") || "[]");
        const dashboard = dashboards.find((d: DashboardToken) => d.id === dashboardId);
        
        if (dashboard?.url) {
          const isServerLive = await checkServerHealth(dashboard.url);
          if (!isServerLive) {
            setDashboardStopped(dashboardId, closeTime);
            
            // Clean up the close time after using it
            setDashboardCloseTimes((prev) => {
              const updated = { ...prev };
              delete updated[dashboardId];
              return updated;
            });
          }
        }
      }
    };

    // Check immediately and then every 15 seconds
    checkDashboardsWithCloseTimes();
    const interval = setInterval(checkDashboardsWithCloseTimes, 15000);

    return () => clearInterval(interval);
  }, [dashboardCloseTimes, dashboardStopTimes, selectedDashboard?.id, localStorageLoaded]);

  // Save to localStorage whenever data changes
  useEffect(() => {
    saveDashboardStorage();
  }, [
    dashboardData,
    chartHistories,
    dashboardStopTimes,
    dashboardCloseTimes,
    dashboardOpenedStatus,
    selectedDashboard?.id,
  ]);

  // Handle browser tab close/refresh to save elapsed time
  useEffect(() => {
    if (!selectedDashboard?.id || !selectedDashboard?.created_at) return;

    const handleBeforeUnload = () => {
      const currentStopTime = dashboardStopTimesRef.current[selectedDashboard.id];
      if (currentStopTime) return;

      try {
        const elapsedString = calculateElapsedTime(selectedDashboard.created_at);

        setDashboardCloseTimes((prev) => ({
          ...prev,
          [selectedDashboard.id]: elapsedString,
        }));

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
          data.dashboardOpenedStatus = {
            ...data.dashboardOpenedStatus,
            [selectedDashboard.id]: true,
          };
          localStorage.setItem(dashboardSpecificKey, JSON.stringify(data));
        }
      } catch (error) {
        // Silently handle localStorage errors
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [selectedDashboard?.id, selectedDashboard?.created_at]);

  const fetchVUData = async (url: string, retries: number = 0): Promise<VUReport[]> => {
    if (!url) return [];
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        // Add delay if service worker was recently unregistered
        if (attempt === 0 && typeof window !== 'undefined') {
          const swUnregistered = sessionStorage.getItem('sw-unregistered');
          if (swUnregistered && Date.now() - parseInt(swUnregistered) < 3000) {
            await new Promise(resolve => setTimeout(resolve, 200));
          }
        }

        const response = await fetch(url, { 
          cache: "no-store",
          signal: AbortSignal.timeout(3000 + attempt * 500)
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const json = await response.json();

        if (!Array.isArray(json)) {
          return [];
        }

        const validatedData: VUReport[] = [];
        const invalidData: any[] = [];

        json.forEach((item, index) => {
          if (!item || typeof item.vu_id !== "number") {
            invalidData.push({ index, item, reason: "Missing or invalid vu_id" });
            return;
          }

          const result = vuReportSchema.safeParse(item);
          if (result.success) {
            validatedData.push(result.data);
          } else {
            invalidData.push({
              index,
              item: { vu_id: item.vu_id },
              reason: "Schema validation failed",
              errors: result.error.issues,
            });
          }
        });

        return validatedData;
        
      } catch (error) {
        if (attempt === retries) return [];
        await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));
      }
    }
    
    return [];
  };

  useEffect(() => {
    if (!selectedDashboard?.url) return;

    if (!localStorageLoaded) {
      return;
    }

    const isStopped = !!dashboardStopTimes[dashboardKey];
    const isStoppedInRef = !!dashboardStopTimesRef.current[dashboardKey];
    const hasCompletedData = !!dashboardData[dashboardKey]?.length && (isStopped || isStoppedInRef);
    
    if (isStopped || isStoppedInRef || hasCompletedData) {
      return;
    }

    let isMounted = true;
    let interval: NodeJS.Timeout;
    let failCount = 0;
    const MAX_FAILS = 3;

    const getData = async () => {
      const currentStopTime = dashboardStopTimesRef.current[dashboardKey] || dashboardStopTimes[dashboardKey];
      if (currentStopTime) {
        clearInterval(interval);
        return;
      }

      const hasExistingData = dashboardDataRef.current[dashboardKey]?.length > 0;
      const isMarkedCompleted = !!currentStopTime;
      if (hasExistingData && isMarkedCompleted) {
        clearInterval(interval);
        return;
      }

      try {
        const data = await fetchVUData(selectedDashboard.url);
        
        const finalStopCheck = dashboardStopTimesRef.current[dashboardKey] || dashboardStopTimes[dashboardKey];
        if (finalStopCheck) {
          clearInterval(interval);
          return;
        }
        
        if (isMounted) {
          if (Array.isArray(data) && data.length > 0) {
            setDashboardData((prev) => ({
              ...prev,
              [dashboardKey]: data,
            }));
            failCount = 0;
          } else {
            failCount++;
          }
        }
      } catch (error) {
        failCount++;
      }

      if (failCount >= MAX_FAILS && interval) {
        clearInterval(interval);

        if (!dashboardStopTimesRef.current[dashboardKey]) {
          const wasOpenedBefore = dashboardOpenedStatusRef.current[dashboardKey];
          const savedCloseTime = dashboardCloseTimesRef.current[dashboardKey];
          
          let elapsed: string;
          // Only use saved close time if dashboard was opened in this session
          if (savedCloseTime && wasOpenedBefore) {
            elapsed = savedCloseTime;
          } else if (wasOpenedBefore && selectedDashboard?.created_at) {
            elapsed = calculateElapsedTime(selectedDashboard.created_at);
          } else {
            elapsed = "0s";
          }

          setDashboardStopped(dashboardKey, elapsed);
          
          // Clean up close time if we used it
          if (savedCloseTime && wasOpenedBefore) {
            setDashboardCloseTimes((prev) => {
              const updated = { ...prev };
              delete updated[dashboardKey];
              return updated;
            });
          }
        }
      }
    };

    getData();
    interval = setInterval(getData, 1000);

    return () => {
      isMounted = false;
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [selectedDashboard, dashboardKey, dashboardStopTimes, localStorageLoaded]);

  const handleDashboardDeleted = (deletedDashboardId: string) => {
    removeDashboardData(deletedDashboardId);

    if (selectedDashboard?.id === deletedDashboardId) {
      setSelectedDashboard(null);
    }
  };

  const currentVUCount = lastGoodData.length;
  const isCompleted = !!dashboardStopTimes[dashboardKey];

  return (
    <SidebarProvider>
      <DashboardSidebar
        selectedDashboard={selectedDashboard}
        onSelectDashboard={setSelectedDashboard}
        onDashboardDeleted={handleDashboardDeleted}
        currentView={currentView}
        onViewChange={setCurrentView}
      />

      <SidebarInset>
        {/* Header */}
        <header className="flex h-12 items-center gap-2 border-b px-4">
          <SidebarTrigger className="text-orange-900" />
          <h1 className="text-lg font-semibold text-orange-900">
            KLT Dashboard
            {currentView === "security" && " - Security Report"}
          </h1>
          {selectedDashboard && (
            <span className="text-xs text-orange-500 ml-auto">
              Dashboard: {selectedDashboard.id}
            </span>
          )}
        </header>

        {/* Main Content */}
        <div className="p-6">
          {currentView === "dashboard" ? (
            <div className="@container/main flex flex-col gap-4 md:gap-6">
              <SectionCards
                lttoken={selectedDashboard ?? undefined}
                stopped={isCompleted}
                stopTime={dashboardStopTimes[dashboardKey]}
                currentVUCount={currentVUCount}
              />

              <ChartAreaInteractive
                vuData={lastGoodData}
                chartHistory={chartHistory}
                setChartHistory={setChartHistory}
                isCompleted={isCompleted}
              />
              <DataTable data={lastGoodData} isCompleted={isCompleted} />
            </div>
          ) : currentView === "security" && selectedDashboard?.security_report ? (
            <SecurityReportView securityReport={selectedDashboard.security_report} />
          ) : (
            <div className="flex items-center justify-center h-64">
              <div className="text-center text-orange-600">
                <p>No security report available for this dashboard.</p>
              </div>
            </div>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

// Separate component to handle search params
function DashboardWithSearchParams() {
  const { selectedDashboard, setSelectedDashboard } = useDashboard();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Utility function to get dashboards from localStorage
  const getDashboardsFromStorage = (): DashboardToken[] => {
    try {
      const savedDashboards = localStorage.getItem("klt-dashboards");
      if (savedDashboards) {
        return JSON.parse(savedDashboards);
      }
    } catch (error) {
      // Silently handle parsing errors
    }
    return [];
  };

  // Utility function to save dashboard to localStorage
  const saveDashboardToStorage = (dashboardToken: DashboardToken) => {
    try {
      const dashboards = getDashboardsFromStorage();
      const existingIndex = dashboards.findIndex(d => d.id === dashboardToken.id);
      
      if (existingIndex >= 0) {
        dashboards[existingIndex] = dashboardToken;
      } else {
        dashboards.unshift(dashboardToken);
      }
      
      localStorage.setItem("klt-dashboards", JSON.stringify(dashboards));
    } catch (error) {
      // Silently handle localStorage errors
    }
  };

  // Load dashboard from klt-dashboards array in localStorage
  const loadDashboardFromStorage = (dashboardId: string): boolean => {
    const dashboards = getDashboardsFromStorage();
    const dashboard = dashboards.find((d) => d.id === dashboardId);
    
    if (dashboard) {
      setSelectedDashboard(dashboard);
      return true;
    }
    
    return false;
  };

  useEffect(() => {
    if (loading) {
      const timeout = setTimeout(() => {
        setLoading(false);
        if (!selectedDashboard && !error) {
          setError('Request timed out. Using cached data if available.');
        }
      }, 10000);

      return () => clearTimeout(timeout);
    }
  }, [loading, selectedDashboard, error]);

  const fetchDashboardToken = async (dashboardId: string, retries: number = 0) => {
    setLoading(true);
    setError(null);
    
    try {
      for (let attempt = 0; attempt <= retries; attempt++) {
        try {
          // Add delay if service worker was recently unregistered
          if (attempt === 0 && typeof window !== 'undefined') {
            const swUnregistered = sessionStorage.getItem('sw-unregistered');
            if (swUnregistered && Date.now() - parseInt(swUnregistered) < 3000) {
              await new Promise(resolve => setTimeout(resolve, 500));
            }
          }

          // Disable service worker during token fetch to avoid interference
          const disableSWOriginal = localStorage.getItem('disable-sw');
          localStorage.setItem('disable-sw', 'true');

          const response = await fetch("http://localhost:2345/dashboards", {
            cache: "no-store",
            signal: AbortSignal.timeout(3000 + attempt * 1000)
          });
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          const dashboardToken = await response.json();
          
          // Store token immediately in klt-dashboards array
          if (dashboardToken && dashboardToken.id) {
            saveDashboardToStorage(dashboardToken);
            
            // Set the selected dashboard if it matches the requested ID
            if (dashboardToken.id === dashboardId) {
              setSelectedDashboard(dashboardToken);
            }
          }

          // Restore original service worker setting
          if (disableSWOriginal === null) {
            localStorage.removeItem('disable-sw');
          } else {
            localStorage.setItem('disable-sw', disableSWOriginal);
          }
          
          // Only check ID match after storage is complete
          if (dashboardToken.id === dashboardId) {
            return; // Successfully stored and set the dashboard
          } else {
            throw new Error(`Dashboard ID mismatch: expected ${dashboardId}, got ${dashboardToken.id}`);
          }
          
        } catch (error) {
          // Restore original service worker setting on error
          const disableSWOriginal = localStorage.getItem('disable-sw');
          if (disableSWOriginal === 'true') {
            localStorage.removeItem('disable-sw');
          }
          
          if (attempt === retries) throw error;
          await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));
        }
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to fetch dashboard");
      
      // Try to load from klt-dashboards array as fallback
      if (loadDashboardFromStorage(dashboardId)) {
        setError(null);
      } else {
        setError("Dashboard token unavailable. The server may have closed after serving the initial request.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const dashboardId = searchParams?.get("dashboard");
    if (dashboardId) {
      // Check if we already have this dashboard loaded
      if (selectedDashboard?.id === dashboardId) {
        return; // Already loaded
      }
      
      // Try localStorage first for faster loading
      if (loadDashboardFromStorage(dashboardId)) {
        // Fetch updated data in background (but don't block on it)
        setTimeout(() => {
          fetchDashboardToken(dashboardId).catch(() => {});
        }, 100);
      } else {
        // No cached data, fetch from server
        fetchDashboardToken(dashboardId);
      }
    } else {
      setSelectedDashboard(null);
    }
  }, [searchParams?.get("dashboard")]);

  const dashboardId = searchParams?.get("dashboard");
  if (!dashboardId) {
    return <DashboardListPage />;
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-orange-900">Loading dashboard...</div>
      </div>
    );
  }

  if (error && !selectedDashboard) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-red-600 mb-2">Failed to load dashboard</div>
          <div className="text-sm text-gray-600 mb-4">{error}</div>
          {error.includes("Dashboard token unavailable") && (
            <div className="text-xs text-orange-600 bg-orange-50 p-3 rounded">
              <strong>Note:</strong> The dashboard server only serves one request per session. 
              If you've unregistered the service worker, the token may no longer be available. 
              Try restarting the load test to generate a new token.
            </div>
          )}
        </div>
      </div>
    );
  }

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
