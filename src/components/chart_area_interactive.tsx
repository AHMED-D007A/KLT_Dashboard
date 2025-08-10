"use client";

import * as React from "react";
import { Area, AreaChart, CartesianGrid } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Button } from "@/components/ui/button";
import { VUReport, StepReport } from "@/types/dashboard";

export const description = "An interactive area chart";

function getAverage(arr: number[] | undefined): number {
  if (!Array.isArray(arr) || arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

interface ChartHistory {
  overall: Array<{ timestamp: number; avg_latency: number }>;
  perStep: Record<string, Array<{ timestamp: number; value: number }>>;
  perVU: Record<string, Array<{ timestamp: number; value: number }>>;
}

interface ChartAreaInteractiveProps {
  vuData: VUReport[];
  chartHistory: ChartHistory;
  setChartHistory: (updater: (prev: ChartHistory) => ChartHistory) => void;
  isCompleted?: boolean;
}

export function ChartAreaInteractive({
  vuData = [],
  chartHistory,
  setChartHistory,
  isCompleted = false,
}: ChartAreaInteractiveProps) {
  const [view, setView] = React.useState<"overall" | "perStep" | "perVU">(
    "overall"
  );
  const [showAllMiniCharts, setShowAllMiniCharts] = React.useState(false);

  // Use a ref to track the last processed data to prevent infinite loops
  const lastProcessedDataRef = React.useRef<string>("");

  // Update chart history when vuData changes
  React.useEffect(() => {
    if (!Array.isArray(vuData) || vuData.length === 0) return;

    // Skip updates if dashboard is completed
    if (isCompleted) {
      console.log("Dashboard is completed, skipping chart updates");
      return;
    }

    // Create a hash of the current data to avoid processing the same data twice
    const dataHash = JSON.stringify(
      vuData.map((vu) => ({
        id: vu.vu_id,
        stepCount: vu.steps?.length || 0,
        timestamp: Date.now(),
      }))
    );

    // Skip if we've already processed this exact data
    if (dataHash === lastProcessedDataRef.current) return;
    lastProcessedDataRef.current = dataHash;

    const timestamp = Date.now();

    // Calculate overall average latency
    let allLatencies: number[] = [];
    vuData.forEach((vu) => {
      vu.steps?.forEach((step: StepReport) => {
        if (Array.isArray(step.step_response_time)) {
          allLatencies.push(...step.step_response_time);
        }
      });
    });
    const avg_latency = getAverage(allLatencies) / 1_000_000; // Convert to ms

    // Get all unique step names
    const allSteps = Array.from(
      new Set(vuData.flatMap((vu) => vu.steps?.map((s) => s.step_name) || []))
    ).filter(Boolean);

    setChartHistory((prev) => {
      // Per Step calculations
      const perStep: Record<
        string,
        Array<{ timestamp: number; value: number }>
      > = { ...prev.perStep };
      allSteps.forEach((stepName: string) => {
        let arr: number[] = [];
        vuData.forEach((vu) => {
          vu.steps?.forEach((s) => {
            if (
              s.step_name === stepName &&
              Array.isArray(s.step_response_time)
            ) {
              arr.push(...s.step_response_time);
            }
          });
        });
        const value = getAverage(arr) / 1_000_000; // Convert to ms
        if (!perStep[stepName]) perStep[stepName] = [];
        perStep[stepName] = [...perStep[stepName], { timestamp, value }];
      });

      // Per VU calculations
      const allVUs = Array.from(
        new Set(vuData.map((vu) => vu.vu_id.toString()))
      );
      const perVU: Record<
        string,
        Array<{ timestamp: number; value: number }>
      > = { ...prev.perVU };
      allVUs.forEach((vuId: string) => {
        let arr: number[] = [];
        vuData.forEach((vu) => {
          if (vu.vu_id.toString() === vuId) {
            vu.steps?.forEach((step) => {
              if (Array.isArray(step.step_response_time)) {
                arr.push(...step.step_response_time);
              }
            });
          }
        });
        const value = getAverage(arr) / 1_000_000; // Convert to ms
        if (!perVU[vuId]) perVU[vuId] = [];
        perVU[vuId] = [...perVU[vuId], { timestamp, value }];
      });

      return {
        overall: [...prev.overall, { timestamp, avg_latency }],
        perStep,
        perVU,
      };
    });
  }, [vuData, isCompleted]); // Added isCompleted to dependencies

  // Chart data for current view from history
  const chartData = React.useMemo(() => {
    if (view === "overall") {
      return chartHistory.overall.map((pt) => ({
        timestamp: pt.timestamp,
        avg_latency: pt.avg_latency,
      }));
    } else if (view === "perStep") {
      const stepNames = Object.keys(chartHistory.perStep);
      const allTimestamps = Array.from(
        new Set(
          stepNames.flatMap((step) =>
            (chartHistory.perStep[step] || []).map((pt) => pt.timestamp)
          )
        )
      ).sort((a, b) => a - b);

      return allTimestamps.map((timestamp) => {
        const row: Record<string, number | undefined> = { timestamp };
        stepNames.forEach((step) => {
          const pt = (chartHistory.perStep[step] || []).find(
            (pt) => pt.timestamp === timestamp
          );
          if (pt) row[step] = pt.value;
        });
        return row;
      });
    } else if (view === "perVU") {
      const vuIds = Object.keys(chartHistory.perVU);
      const allTimestamps = Array.from(
        new Set(
          vuIds.flatMap((vu) =>
            (chartHistory.perVU[vu] || []).map((pt) => pt.timestamp)
          )
        )
      ).sort((a, b) => a - b);

      return allTimestamps.map((timestamp) => {
        const row: Record<string, number | undefined> = { timestamp };
        vuIds.forEach((vu) => {
          const pt = (chartHistory.perVU[vu] || []).find(
            (pt) => pt.timestamp === timestamp
          );
          if (pt) row[vu] = pt.value;
        });
        return row;
      });
    }
    return [];
  }, [chartHistory, view]);

  // Chart config for each view - FIXED: Use proper chart colors
  const chartConfig = React.useMemo(() => {
    if (view === "overall") {
      return {
        avg_latency: {
          label: "Avg Latency (ms)",
          color: "var(--chart-1)", // Keep the CSS variable format
        },
      };
    } else if (view === "perStep") {
      const steps = Object.keys(chartHistory.perStep);
      const colors = [
        "var(--chart-1)",
        "var(--chart-2)",
        "var(--chart-3)",
        "var(--chart-4)",
        "var(--chart-5)",
      ];
      return Object.fromEntries(
        steps.map((step, i) => [
          step,
          {
            label: step,
            color: colors[i % colors.length],
          },
        ])
      );
    } else if (view === "perVU") {
      const vus = Object.keys(chartHistory.perVU);
      const colors = [
        "var(--chart-1)",
        "var(--chart-2)",
        "var(--chart-3)",
        "var(--chart-4)",
        "var(--chart-5)",
      ];
      return Object.fromEntries(
        vus.map((vu, i) => [
          vu,
          {
            label: `VU ${vu}`,
            color: colors[i % colors.length],
          },
        ])
      );
    }
    return {};
  }, [view, chartHistory]);

  // Mini charts data for detailed view
  const miniChartsData = React.useMemo(() => {
    if (view === "perStep") {
      return Object.entries(chartHistory.perStep).map(([step, arr]) => ({
        key: step,
        label: step,
        data: arr.map((pt) => ({
          timestamp: pt.timestamp,
          value: pt.value,
        })),
      }));
    } else if (view === "perVU") {
      return Object.entries(chartHistory.perVU).map(([vu, arr]) => ({
        key: vu,
        label: `VU ${vu}`,
        data: arr.map((pt) => ({
          timestamp: pt.timestamp,
          value: pt.value,
        })),
      }));
    }
    return [];
  }, [view, chartHistory]);

  // Determine how many mini charts to show
  const miniChartsToShow = showAllMiniCharts
    ? miniChartsData
    : miniChartsData.slice(0, 4);

  if (!vuData || vuData.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Average Latency</CardTitle>
          <CardDescription>No data available</CardDescription>
        </CardHeader>
        <CardContent className="h-[250px] flex items-center justify-center text-gray-500">
          No data is available
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="@container/card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Average Latency</CardTitle>
            <CardDescription>
              <span className="hidden @[540px]/card:block">
                Latency by{" "}
                {view === "overall"
                  ? "All Steps"
                  : view === "perStep"
                  ? "Step"
                  : "VU"}
              </span>
              <span className="@[540px]/card:hidden">Latency</span>
            </CardDescription>
          </div>
          <ToggleGroup
            type="single"
            value={view}
            onValueChange={(v) =>
              v && setView(v as "overall" | "perStep" | "perVU")
            }
            variant="outline"
            className="gap-2"
          >
            <ToggleGroupItem
              value="overall"
              className={`text-xs transition-all ${
                view === "overall"
                  ? "bg-orange-100 text-orange-900 border-orange-300 shadow-sm"
                  : "hover:bg-oragne-50"
              }`}
            >
              Overall
            </ToggleGroupItem>
            <ToggleGroupItem
              value="perStep"
              className={`text-xs transition-all ${
                view === "perStep"
                  ? "bg-orange-100 text-orange-900 border-orange-300 shadow-sm"
                  : "hover:bg-orange-50"
              }`}
            >
              Per Step
            </ToggleGroupItem>
            <ToggleGroupItem
              value="perVU"
              className={`text-xs transition-all ${
                view === "perVU"
                  ? "bg-orange-100 text-orange-900 border-orange-300 shadow-sm"
                  : "hover:bg-orange-50"
              }`}
            >
              Per VU
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </CardHeader>

      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
        >
          <AreaChart data={chartData}>
            <CartesianGrid vertical={false} />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="line" hideLabel />}
            />
            {Object.keys(chartConfig).map((key) => (
              <Area
                key={key}
                dataKey={key}
                type="natural"
                fill={chartConfig[key].color}
                fillOpacity={0.3}
                stroke={chartConfig[key].color}
                strokeWidth={2}
                name={chartConfig[key].label || key}
              />
            ))}
          </AreaChart>
        </ChartContainer>
      </CardContent>

      {/* Mini charts for detailed view */}
      {(view === "perStep" || view === "perVU") &&
        miniChartsData.length > 0 && (
          <div className="px-4">
            {/* Toggle button for showing all charts - always show if there are more than 4 */}
            {miniChartsData.length > 4 && (
              <div className="mb-4 flex justify-between items-center">
                <h3 className="text-sm font-medium text-gray-700">
                  Individual {view === "perStep" ? "Step" : "VU"} Charts
                  <span className="text-gray-500 font-normal ml-1">
                    (
                    {showAllMiniCharts
                      ? miniChartsData.length
                      : Math.min(4, miniChartsData.length)}{" "}
                    of {miniChartsData.length})
                  </span>
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAllMiniCharts(!showAllMiniCharts)}
                  className="text-xs cursor-pointer"
                >
                  {showAllMiniCharts
                    ? `Show Less (4 of ${miniChartsData.length})`
                    : `Show All ${view === "perStep" ? "Steps" : "VUs"} (${
                        miniChartsData.length
                      })`}
                </Button>
              </div>
            )}

            {/* Show header even when 4 or fewer charts */}
            {miniChartsData.length <= 4 && (
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-700">
                  Individual {view === "perStep" ? "Step" : "VU"} Charts
                  <span className="text-gray-500 font-normal ml-1">
                    ({miniChartsData.length})
                  </span>
                </h3>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {miniChartsToShow.map(({ key, label, data }, index) => {
                // Use different colors for mini charts
                const miniColors = [
                  "var(--chart-1)",
                  "var(--chart-2)",
                  "var(--chart-3)",
                  "var(--chart-4)",
                  "var(--chart-5)",
                ];
                const color = miniColors[index % miniColors.length];

                return (
                  <Card key={key} className="h-[180px] overflow-hidden">
                    <CardHeader>
                      <CardTitle
                        className="font-medium truncate leading-tight -m-2"
                        title={label}
                      >
                        {label}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-3">
                      <div className="h-[130px] w-full">
                        <ChartContainer
                          config={{
                            value: {
                              label,
                              color: color,
                            },
                          }}
                          className="h-full w-full"
                        >
                          <AreaChart
                            data={data}
                            margin={{ top: 20, right: 2, left: 2, bottom: 20 }}
                          >
                            <ChartTooltip
                              cursor={false}
                              content={<ChartTooltipContent indicator="dot" />}
                            />
                            <Area
                              type="natural"
                              dataKey="value"
                              fill={color}
                              fillOpacity={0.4}
                              stroke={color}
                              strokeWidth={1.5}
                              name={chartConfig[key].label || key}
                            />
                          </AreaChart>
                        </ChartContainer>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Additional toggle at the end for larger datasets */}
            {miniChartsData.length > 4 && (
              <div className="mt-4 flex justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAllMiniCharts(!showAllMiniCharts)}
                  className="text-xs cursor-pointer"
                >
                  {showAllMiniCharts
                    ? `Show Less (4 of ${miniChartsData.length})`
                    : `Show All ${view === "perStep" ? "Steps" : "VUs"} (${
                        miniChartsData.length
                      })`}
                </Button>
              </div>
            )}
          </div>
        )}
    </Card>
  );
}
