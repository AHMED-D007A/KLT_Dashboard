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

  useEffect(() => {
    dashboardOpenedStatusRef.current = dashboardOpenedStatus;
  }, [dashboardOpenedStatus]);

  const getDashboardSpecificKey = (baseKey: string, dashboardId: string) =>
    `${baseKey}-dashboard-${dashboardId}`;

  const formatSecondsToDuration = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return h > 0 ? `${h}h ${m}m ${s}s` : m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  useEffect(() => {
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
        setDashboardData(data.dashboardData || {});
        setChartHistories(data.chartHistories || {});
        setDashboardStopTimes(data.dashboardStopTimes || {});
        setDashboardCloseTimes(data.dashboardCloseTimes || {});
        setDashboardOpenedStatus(data.dashboardOpenedStatus || {});
      }
    } catch (error) {
      console.error("Failed to load from localStorage:", error);
    } finally {
      // Mark localStorage as loaded regardless of success/failure
      setLocalStorageLoaded(true);
    }
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
          setDashboardStopTimes((prev) => ({
            ...prev,
            [dashboardKey]: "0s",
          }));
        }
      });
    }
  }, [selectedDashboard?.id, dashboardOpenedStatus, selectedDashboard?.url, localStorageLoaded]);

  const checkServerHealth = async (url: string, retries: number = 0): Promise<boolean> => {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
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
        
        if (response.ok) {
          return true;
        }
        
        if (response.status >= 400 && response.status < 500) {
          return false;
        }
        
      } catch (error) {
        const isLastAttempt = attempt === retries;
        
        if (isLastAttempt) {
          return false;
        }
        
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

    if (dashboardStopTimes[dashboardKey]) {
      return;
    }

    if (dashboardCloseTimes[dashboardKey]) {
      const checkServerAndHandleTiming = async () => {
        const isServerLive = await checkServerHealth(selectedDashboard.url);
        
        if (!isServerLive) {
          const savedCloseTime = dashboardCloseTimes[dashboardKey];
          setDashboardStopTimes((prev) => ({
            ...prev,
            [dashboardKey]: savedCloseTime,
          }));

          setDashboardCloseTimes((prev) => {
            const updated = { ...prev };
            delete updated[dashboardKey];
            return updated;
          });
        } else {
          setDashboardCloseTimes((prev) => {
            const updated = { ...prev };
            delete updated[dashboardKey];
            return updated;
          });
        }
      };

      checkServerAndHandleTiming();
    } else {
      const checkInitialServerHealth = async () => {
        const isServerLive = await checkServerHealth(selectedDashboard.url);
        
        if (!isServerLive) {
          if (dashboardOpenedStatus[dashboardKey]) {
            setDashboardStopTimes((prev) => ({
              ...prev,
              [dashboardKey]: "0s",
            }));
          } else {
            setDashboardStopTimes((prev) => ({
              ...prev,
              [dashboardKey]: "0s",
            }));
          }
        }
      };

      checkInitialServerHealth();
      
      const healthCheckInterval = setInterval(async () => {
        const isServerLive = await checkServerHealth(selectedDashboard.url);
        if (!isServerLive && !dashboardStopTimes[dashboardKey]) {
          const start = new Date(selectedDashboard.created_at).getTime();
          const now = Date.now();
          const elapsedSeconds = Math.max(0, Math.floor((now - start) / 1000));
          const elapsedString = formatSecondsToDuration(elapsedSeconds);
          
          setDashboardStopTimes((prev) => ({
            ...prev,
            [dashboardKey]: elapsedString,
          }));
        }
      }, 10000);

      return () => clearInterval(healthCheckInterval);
    }
  }, [selectedDashboard, dashboardStopTimes, dashboardCloseTimes, dashboardOpenedStatus, localStorageLoaded]);

  // Save to localStorage whenever data changes using dashboard-specific key
  useEffect(() => {
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
      console.error("Failed to save to localStorage:", error);
    }
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
      if (currentStopTime) {
        return;
      }

      try {
        const start = new Date(selectedDashboard.created_at).getTime();
        const now = Date.now();
        const elapsedSeconds = Math.max(0, Math.floor((now - start) / 1000));
        const elapsedString = formatSecondsToDuration(elapsedSeconds);

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
        console.error("Failed to save close time on unload:", error);
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [selectedDashboard?.id, selectedDashboard?.created_at]);

  const fetchVUData = async (url: string, retries: number = 0): Promise<VUReport[]> => {
    if (!url) return [];
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
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
          console.warn("API returned non-array data:", typeof json);
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
        const isLastAttempt = attempt === retries;
        
        if (isLastAttempt) {
          return [];
        }
        
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
          let elapsed = "0s";
          
          const wasOpenedBefore = dashboardOpenedStatusRef.current[dashboardKey];
          
          if (!wasOpenedBefore) {
            elapsed = "0s";
          } else if (selectedDashboard?.created_at) {
            const start = new Date(selectedDashboard.created_at).getTime();
            const now = Date.now();
            const diff = Math.max(0, Math.floor((now - start) / 1000));
            elapsed = formatSecondsToDuration(diff);
          }

          setDashboardStopTimes((prev) => ({
            ...prev,
            [dashboardKey]: elapsed,
          }));
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
    });

    setDashboardOpenedStatus((prev) => {
      const updated = { ...prev };
      delete updated[deletedDashboardId];
      return updated;
    });

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
          if (attempt === 0 && typeof window !== 'undefined') {
            const swUnregistered = sessionStorage.getItem('sw-unregistered');
            if (swUnregistered && Date.now() - parseInt(swUnregistered) < 3000) {
              await new Promise(resolve => setTimeout(resolve, 500));
            }
          }

          const response = await fetch("http://localhost:2345/dashboards", {
            signal: AbortSignal.timeout(3000 + attempt * 1000)
          });
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          const dashboardToken = await response.json();
          
          if (dashboardToken.id === dashboardId) {
            setSelectedDashboard(dashboardToken);
            
            const savedDashboards = localStorage.getItem("klt-dashboards");
            let dashboards: DashboardToken[] = [];
            
            if (savedDashboards) {
              try {
                dashboards = JSON.parse(savedDashboards);
              } catch (error) {
                console.error("Failed to parse saved dashboards:", error);
              }
            }
            
            const existingIndex = dashboards.findIndex(d => d.id === dashboardToken.id);
            if (existingIndex >= 0) {
              dashboards[existingIndex] = dashboardToken;
            } else {
              dashboards.unshift(dashboardToken);
            }
            
            localStorage.setItem("klt-dashboards", JSON.stringify(dashboards));
            return;
          } else {
            throw new Error(`Dashboard ID mismatch: expected ${dashboardId}, got ${dashboardToken.id}`);
          }
          
        } catch (error) {
          const isLastAttempt = attempt === retries;
          
          if (!isLastAttempt) {
            await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));
            continue;
          }
          
          throw error;
        }
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to fetch dashboard");
      
      const savedDashboards = localStorage.getItem("klt-dashboards");
      if (savedDashboards) {
        try {
          const parsed: DashboardToken[] = JSON.parse(savedDashboards);
          const dashboard = parsed.find((d) => d.id === dashboardId);
          if (dashboard) {
            setSelectedDashboard(dashboard);
            setError(null);
          }
        } catch (error) {
          console.error("Failed to parse saved dashboards:", error);
        }
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
      const savedDashboards = localStorage.getItem("klt-dashboards");
      if (savedDashboards) {
        try {
          const parsed: DashboardToken[] = JSON.parse(savedDashboards);
          const dashboard = parsed.find((d) => d.id === dashboardId);
          if (dashboard) {
            setSelectedDashboard(dashboard);
            fetchDashboardToken(dashboardId).catch(() => {});
            return;
          }
        } catch (error) {
          console.error("Failed to parse saved dashboards:", error);
        }
      }
      
      fetchDashboardToken(dashboardId);
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
        <div className="text-center">
          <div className="text-red-600 mb-2">Failed to load dashboard</div>
          <div className="text-sm text-gray-600">{error}</div>
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
