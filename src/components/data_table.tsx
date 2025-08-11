"use client";

import * as React from "react";
import { useDataTableInstance } from "@/hooks/use-data-table-instance";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VUReport, StepReport } from "@/types/dashboard";
import { DataTable as DataTableCore } from "@/components/data-table/data-table";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";

type AggregatedStepReport = StepReport & {
  vu_id?: number;
  step_response_time_averages?: number[];
};

function getAverageMS(arr: number[] | undefined): string {
  if (!Array.isArray(arr) || arr.length === 0) return "-";
  const avgNs = arr.reduce((a, b) => a + b, 0) / arr.length;
  const avgMs = avgNs / 1_000_000;
  return avgMs.toFixed(2);
}

function getP95(arr: number[] | undefined): string {
  if (!Array.isArray(arr) || arr.length === 0) return "-";
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.floor(0.95 * (sorted.length - 1));
  const p95Ns = sorted[idx];
  const p95Ms = p95Ns / 1_000_000;
  return p95Ms.toFixed(2);
}

function getP90(arr: number[] | undefined): string {
  if (!Array.isArray(arr) || arr.length === 0) return "-";
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.floor(0.90 * (sorted.length - 1));
  const p90Ns = sorted[idx];
  const p90Ms = p90Ns / 1_000_000;
  return p90Ms.toFixed(2);
}

function getP99(arr: number[] | undefined): string {
  if (!Array.isArray(arr) || arr.length === 0) return "-";
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.floor(0.99 * (sorted.length - 1));
  const p99Ns = sorted[idx];
  const p99Ms = p99Ns / 1_000_000;
  return p99Ms.toFixed(2);
}

function formatMB(bytes: number | undefined): string {
  if (typeof bytes !== "number" || isNaN(bytes)) return "-";
  return (bytes / (1024 * 1024)).toFixed(2);
}

interface DataTableProps {
  data: VUReport[];
  isCompleted?: boolean;
}

export function DataTable({ data: initialData, isCompleted = false }: DataTableProps) {
  const [originalData, setOriginalData] = React.useState<VUReport[]>(() => initialData ?? []);
  const [view, setView] = React.useState<"virtual-users" | "steps">("virtual-users");

  // State for reordered data in each view
  const [vuData, setVuData] = React.useState<VUReport[]>(() => initialData ?? []);
  const [stepsData, setStepsData] = React.useState<AggregatedStepReport[]>(() => {
    return (initialData ?? []).flatMap((vu) =>
      Array.isArray(vu.steps) ? vu.steps.map((step) => ({ ...step, vu_id: vu.vu_id })) : []
    );
  });

  React.useEffect(() => {
    // Always update data when initialData changes, regardless of completion status
    console.log("DataTable updating with data:", initialData?.length || 0, "records");
    setOriginalData(initialData ?? []);
    setVuData(initialData ?? []);
    setStepsData(
      (initialData ?? []).flatMap((vu) =>
        Array.isArray(vu.steps) ? vu.steps.map((step) => ({ ...step, vu_id: vu.vu_id })) : []
      )
    );
  }, [initialData]); // Removed isCompleted dependency

  React.useEffect(() => {
    // Always update view data when view or originalData changes
    if (view === "virtual-users") {
      setVuData(originalData);
    } else if (view === "steps") {
      setStepsData(
        originalData.flatMap((vu) =>
          Array.isArray(vu.steps) ? vu.steps.map((step) => ({ ...step, vu_id: vu.vu_id })) : []
        )
      );
    }
  }, [view, originalData]); // Removed isCompleted dependency

  // Memoize steps aggregation
  const aggregatedSteps = React.useMemo<AggregatedStepReport[]>(() => {
    const stepMap: Record<string, AggregatedStepReport> = {};
    const stepAverages: Record<string, number[]> = {};
    
    // Use current originalData regardless of completion status for aggregation
    originalData.forEach((vu) => {
      if (Array.isArray(vu.steps)) {
        vu.steps.forEach((step) => {
          const key = step.step_name;
          if (!key) return;
          
          if (!stepMap[key]) {
            stepMap[key] = {
              step_name: key,
              step_count: 0,
              step_failure: 0,
              step_response_time: [],
              step_bytes_in: 0,
              step_bytes_out: 0,
              step_response_time_averages: [],
            };
            stepAverages[key] = [];
          }
          
          stepMap[key].step_count += typeof step.step_count === "number" ? step.step_count : 0;
          stepMap[key].step_failure += typeof step.step_failure === "number" ? step.step_failure : 0;
          stepMap[key].step_bytes_in += typeof step.step_bytes_in === "number" ? step.step_bytes_in : 0;
          stepMap[key].step_bytes_out += typeof step.step_bytes_out === "number" ? step.step_bytes_out : 0;
          
          if (Array.isArray(step.step_response_time) && step.step_response_time.length > 0) {
            stepMap[key].step_response_time.push(...step.step_response_time);
            const avg = step.step_response_time.reduce((a, b) => a + b, 0) / step.step_response_time.length;
            stepAverages[key].push(avg);
          }
        });
      }
    });
    
    Object.keys(stepMap).forEach((key) => {
      stepMap[key].step_response_time_averages = stepAverages[key];
    });
    
    return Object.values(stepMap);
  }, [originalData]);

  React.useEffect(() => {
    // Always update view data when view or aggregatedSteps changes
    if (view === "virtual-users") {
      setVuData(originalData);
    } else if (view === "steps") {
      setStepsData(aggregatedSteps);
    }
  }, [view, aggregatedSteps]); // Removed isCompleted dependency

  // Columns for Virtual Users
  const vuColumns = [
    { accessorKey: "vu_id", header: "ID" },
    { accessorKey: "ts_exec_count", header: "TSExecCount" },
    { accessorKey: "ts_exec_failure", header: "TSExecFailure" },
    {
      accessorKey: "steps",
      header: "StepExecCount",
      cell: ({ row }: { row: { original: VUReport } }) =>
        Array.isArray(row.original.steps)
          ? row.original.steps.reduce(
              (sum: number, step: StepReport) => sum + (typeof step.step_count === "number" ? step.step_count : 0),
              0
            )
          : "-",
    },
    {
      accessorKey: "ts_exec_time",
      header: "AvgTSExecTime(ms)",
      cell: ({ row }: { row: { original: VUReport } }) => getAverageMS(row.original.ts_exec_time),
    },
    {
      accessorKey: "ts_exec_time_p90",
      header: "P90TSExecTime(ms)",
      cell: ({ row }: { row: { original: VUReport } }) => getP90(row.original.ts_exec_time),
    },
    {
      accessorKey: "ts_exec_time_p95",
      header: "P95TSExecTime(ms)",
      cell: ({ row }: { row: { original: VUReport } }) => getP95(row.original.ts_exec_time),
    },
    {
      accessorKey: "ts_exec_time_p99",
      header: "P99TSExecTime(ms)",
      cell: ({ row }: { row: { original: VUReport } }) => getP99(row.original.ts_exec_time),
    },
  ];

  // Columns for Steps
  const stepColumns = [
    { accessorKey: "step_name", header: "Step Name" },
    {
      accessorKey: "step_count",
      header: "Count(All VUs)",
      cell: ({ row }: { row: { original: AggregatedStepReport } }) => row.original.step_count ?? "-",
    },
    {
      accessorKey: "step_failure",
      header: "Failure(All VUs)",
      cell: ({ row }: { row: { original: AggregatedStepReport } }) => row.original.step_failure ?? "-",
    },
    {
      accessorKey: "step_bytes_in",
      header: "BytesIn(MB)",
      cell: ({ row }: { row: { original: AggregatedStepReport } }) =>
        formatMB(row.original.step_bytes_in),
    },
    {
      accessorKey: "step_bytes_out",
      header: "BytesOut (MB)",
      cell: ({ row }: { row: { original: AggregatedStepReport } }) =>
        formatMB(row.original.step_bytes_out),
    },
    {
      accessorKey: "step_response_time",
      header: "AvgResponseTime(ms)",
      cell: ({ row }: { row: { original: AggregatedStepReport } }) => {
        const avgs = row.original.step_response_time_averages;
        if (!Array.isArray(avgs) || avgs.length === 0) return "-";
        const avgNs = avgs.reduce((a: number, b: number) => a + b, 0) / avgs.length;
        const avgMs = avgNs / 1_000_000;
        return avgMs.toFixed(2);
      },
    },
    {
      accessorKey: "p90",
      header: "P90(ms)",
      cell: ({ row }: { row: { original: AggregatedStepReport } }) => getP90(row.original.step_response_time),
    },
    {
      accessorKey: "p95",
      header: "P95(ms)",
      cell: ({ row }: { row: { original: AggregatedStepReport } }) => getP95(row.original.step_response_time),
    },
    {
      accessorKey: "p99",
      header: "P99(ms)",
      cell: ({ row }: { row: { original: AggregatedStepReport } }) => getP99(row.original.step_response_time),
    },
  ];

  // Table instances for each view
  const vuTable = useDataTableInstance<VUReport, unknown>({
    data: vuData,
    columns: vuColumns,
    getRowId: (row, index) => (row.vu_id != null ? row.vu_id.toString() : `row-${index}`),
  });

  const stepTable = useDataTableInstance<AggregatedStepReport, unknown>({
    data: stepsData,
    columns: stepColumns,
    getRowId: (row, index) =>
      row.vu_id != null && row.step_name != null
        ? `${row.vu_id}-${row.step_name}`
        : row.step_name
          ? row.step_name + "-" + index
          : "row-" + index,
  });

  if (!initialData || initialData.length === 0) {
    return (
      <div className="w-full bg-orange-50 border border-orange-200 rounded-lg p-8 text-center text-orange-600">
        No VU data available
      </div>
    );
  }

  return (
    <div className="w-full bg-orange-50 border border-orange-200 rounded-lg overflow-hidden">
      {/* Header with Tabs */}
      <div className="p-4 border-b border-orange-200 bg-orange-100">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-orange-900">Load Test Data</h3>
            <p className="text-sm text-orange-700">
              {view === "virtual-users" 
                ? `${vuData.length} Virtual Users` 
                : `${aggregatedSteps.length} Unique Steps`
              }
            </p>
          </div>
          <Tabs value={view} onValueChange={(v) => setView(v as "virtual-users" | "steps")} className="w-fit">
            <TabsList>
              <TabsTrigger value="virtual-users">Virtual Users</TabsTrigger>
              <TabsTrigger value="steps">Steps</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Table Content */}
      <div className="relative flex flex-col">
        <div className="overflow-hidden px-2">
          {view === "virtual-users" ? (
            <DataTableCore 
              dndEnabled 
              table={vuTable} 
              columns={vuColumns} 
              onReorder={setVuData} 
            />
          ) : (
            <DataTableCore 
              dndEnabled 
              table={stepTable} 
              columns={stepColumns} 
              onReorder={setStepsData} 
            />
          )}
        </div>
        
        {/* Pagination */}
        <div className="p-4 border-t border-orange-200 bg-orange-100">
          {view === "virtual-users" ? (
            <DataTablePagination table={vuTable} />
          ) : (
            <DataTablePagination table={stepTable} />
          )}
        </div>
      </div>
    </div>
  );
}