import { z } from "zod";

// Step Report Schema
export const stepReportSchema = z.object({
  step_name: z.string(),
  step_count: z.number().int().nonnegative(),
  step_failure: z.number().int().nonnegative(),
  step_response_time: z.array(z.number().nonnegative()), // Response times in nanoseconds
  step_bytes_in: z.number().int().nonnegative(),
  step_bytes_out: z.number().int().nonnegative(),
});

// VU Report Schema
export const vuReportSchema = z.object({
  vu_id: z.number().int().min(0),
  ts_exec_count: z.number().int().nonnegative(),
  ts_exec_failure: z.number().int().nonnegative(),
  ts_exec_time: z.array(z.number().nonnegative()), // Execution times in nanoseconds
  steps: z.array(stepReportSchema),
});

// Load Options Schema
export const loadStageSchema = z.object({
  Target: z.number().int().positive(),
  Duration: z.string(),
});

export const thresholdSchema = z.object({
  Metric: z.string(),
  Condition: z.string(),
  Severity: z.string(),
  Value: z.number(),
});

export const loadOptionsSchema = z.object({
  Profile: z.string(),
  VUs: z.number().int().positive(),
  Duration: z.string(),
  RPS: z.number().int().positive(),
  Stages: z.array(loadStageSchema).optional(),
  Thresholds: z.array(thresholdSchema).optional(),
});

// Security Report Schemas
export const securityResultSchema = z.object({
  check_id: z.string(),
  check_name: z.string(),
  status: z.enum(["passed", "failed", "warning"]),
  severity: z.string(),
  description: z.string(),
  details: z.string().optional(),
  recommendation: z.string().optional(),
  // Step information
  step_name: z.string(),
  step_method: z.string(),
  step_url: z.string(),
  status_code: z.number().int().optional(),
  target: z.enum(["request", "response"]),
});

export const stepSecurityResultsSchema = z.object({
  step_name: z.string(),
  step_method: z.string(),
  step_url: z.string(),
  results: z.array(securityResultSchema),
  passed: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
  warnings: z.number().int().nonnegative(),
});

export const securityReportSchema = z.object({
  test_suite: z.string(),
  timestamp: z.string(),
  total_checks: z.number().int().nonnegative(),
  passed: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
  warnings: z.number().int().nonnegative(),
  steps: z.array(stepSecurityResultsSchema),
  summary: z.record(z.string(), z.number().int().nonnegative()),
});

export const dashboardTokenSchema = z.object({
  id: z.string().min(1),
  url: z.string().url(),
  title: z.string().min(1),
  created_at: z.string(),
  description: z.string(),
  load_options: loadOptionsSchema,
  security_report: securityReportSchema.optional(),
  end_at: z.string().optional(),
});

// Chart History Schema
export const chartDataPointSchema = z.object({
  timestamp: z.number().int().positive(),
  value: z.number().nonnegative(),
});

export const chartOverallPointSchema = z.object({
  timestamp: z.number().int().positive(),
  avg_latency: z.number().nonnegative(),
});

export const chartHistorySchema = z.object({
  overall: z.array(chartOverallPointSchema),
  perStep: z.record(z.string(), z.array(chartDataPointSchema)),
  perVU: z.record(z.string(), z.array(chartDataPointSchema)),
});

// API Response Schemas
export const dashboardListSchema = z.array(dashboardTokenSchema);
export const vuDataListSchema = z.array(vuReportSchema);

// Dashboard Data Storage Schema (for persistence)
export const dashboardDataStorageSchema = z.object({
  dashboardData: z.record(z.string(), vuDataListSchema),
  chartHistories: z.record(z.string(), chartHistorySchema),
  dashboardStopTimes: z.record(z.string(), z.string()),
  dashboardCloseTimes: z.record(z.string(), z.string()).optional(),
  dashboardOpenedStatus: z.record(z.string(), z.boolean()).optional(),
});

// Infer TypeScript types from schemas
export type StepReport = z.infer<typeof stepReportSchema>;
export type VUReport = z.infer<typeof vuReportSchema>;
export type LoadStage = z.infer<typeof loadStageSchema>;
export type Threshold = z.infer<typeof thresholdSchema>;
export type LoadOptions = z.infer<typeof loadOptionsSchema>;
export type SecurityResult = z.infer<typeof securityResultSchema>;
export type StepSecurityResults = z.infer<typeof stepSecurityResultsSchema>;
export type SecurityReport = z.infer<typeof securityReportSchema>;
export type DashboardToken = z.infer<typeof dashboardTokenSchema>;
export type ChartDataPoint = z.infer<typeof chartDataPointSchema>;
export type ChartOverallPoint = z.infer<typeof chartOverallPointSchema>;
export type ChartHistory = z.infer<typeof chartHistorySchema>;
export type DashboardDataStorage = z.infer<typeof dashboardDataStorageSchema>;