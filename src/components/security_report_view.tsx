"use client";

import { SecurityReport, SecurityResult, StepSecurityResults } from "@/types/dashboard";
import { Card } from "@/components/ui/card";
import { Badge } from "./ui/badge";
import { CheckCircle, XCircle, AlertTriangle, Shield, Clock, Target, ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";

interface SecurityReportViewProps {
  securityReport: SecurityReport;
}

export function SecurityReportView({ securityReport }: SecurityReportViewProps) {
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());

  const toggleStepExpansion = (stepKey: string) => {
    setExpandedSteps(prev => {
      const newSet = new Set(prev);
      if (newSet.has(stepKey)) {
        newSet.delete(stepKey);
      } else {
        newSet.add(stepKey);
      }
      return newSet;
    });
  };

  const getStepKey = (step: StepSecurityResults) => `${step.step_method}-${step.step_name}`;

  const getStepStatusColor = (step: StepSecurityResults) => {
    if (step.failed > 0) return "border-l-red-500 border-red-200";
    if (step.warnings > 0) return "border-l-yellow-500 border-yellow-200";
    return "border-l-green-500 border-green-200";
  };
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "passed":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "failed":
        return <XCircle className="w-4 h-4 text-red-600" />;
      case "warning":
        return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      default:
        return <Shield className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "passed":
        return "bg-green-100 text-green-800 border-green-200";
      case "failed":
        return "bg-red-100 text-red-800 border-red-200";
      case "warning":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getSeverityColor = (severity: string) => {
    const severityLower = severity.toLowerCase();
    switch (severityLower) {
      case "critical":
        return "bg-red-600 text-white";
      case "high":
        return "bg-red-500 text-white";
      case "medium":
        return "bg-yellow-500 text-white";
      case "low":
        return "bg-blue-500 text-white";
      case "info":
        return "bg-gray-500 text-white";
      default:
        return "bg-gray-400 text-white";
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Shield className="w-10 h-10 text-orange-600" />
        <div>
          <h2 className="text-2xl font-bold text-orange-900">Security Report</h2>
          <p className="text-orange-700">Test Suite: {securityReport.test_suite}</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 border-orange-200">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-orange-600" />
            <div>
              <div className="text-2xl font-bold text-orange-900">{securityReport.total_checks}</div>
              <div className="text-sm text-orange-600">Total Checks</div>
            </div>
          </div>
        </Card>
        
        <Card className="p-4 border-green-200">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <div>
              <div className="text-2xl font-bold text-green-700">{securityReport.passed}</div>
              <div className="text-sm text-green-600">Passed</div>
            </div>
          </div>
        </Card>
        
        <Card className="p-4 border-red-200">
          <div className="flex items-center gap-2">
            <XCircle className="w-5 h-5 text-red-600" />
            <div>
              <div className="text-2xl font-bold text-red-700">{securityReport.failed}</div>
              <div className="text-sm text-red-600">Failed</div>
            </div>
          </div>
        </Card>
        
        <Card className="p-4 border-yellow-200">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
            <div>
              <div className="text-2xl font-bold text-yellow-700">{securityReport.warnings}</div>
              <div className="text-sm text-yellow-600">Warnings</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Report Information & Severity Summary */}
      <Card className="p-4 border-orange-200">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Report Generated */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-orange-600" />
              <span className="text-sm font-medium text-orange-900">Report Generated</span>
            </div>
            <p className="text-orange-700">{formatTimestamp(securityReport.timestamp)}</p>
          </div>

          {/* Severity Summary */}
          {Object.keys(securityReport.summary).length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-orange-900 mb-3">Severity Summary</h4>
              <div className="flex flex-wrap gap-2">
                {Object.entries(securityReport.summary).map(([severity, count]) => (
                  <Badge key={severity} className={getSeverityColor(severity)}>
                    {severity}: {count}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Security Results by Step */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-orange-900">Security Check Results by Step</h3>
        {securityReport.steps.map((step, stepIndex) => {
          const stepKey = getStepKey(step);
          const isExpanded = expandedSteps.has(stepKey);
          
          return (
            <Card key={stepIndex} className={`border-l-4 ${getStepStatusColor(step)}`}>
              {/* Step Header */}
              <div 
                className="p-4 cursor-pointer"
                onClick={() => toggleStepExpansion(stepKey)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {isExpanded ? (
                      <ChevronDown className="w-5 h-5 text-orange-600" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-orange-600" />
                    )}
                    <div>
                      <h4 className="font-semibold text-orange-900">
                        {step.step_method} - {step.step_name}
                      </h4>
                      <p className="text-sm text-orange-700 break-all">{step.step_url}</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Badge className="bg-green-100 text-green-800 border-green-200">
                      Passed: {step.passed}
                    </Badge>
                    <Badge className="bg-red-100 text-red-800 border-red-200">
                      Failed: {step.failed}
                    </Badge>
                    <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
                      Warnings: {step.warnings}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Step Results (Collapsible) */}
              {isExpanded && (
                <div className="border-t border-orange-200 p-4 space-y-4">
                  {step.results.map((result, resultIndex) => (
                    <div key={resultIndex} className="bg-orange-50 p-4 rounded-md space-y-3">
                      {/* Check Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(result.status)}
                          <h5 className="font-semibold text-orange-900">{result.check_name}</h5>
                        </div>
                        <div className="flex gap-2">
                          <Badge className={getStatusColor(result.status)}>
                            {result.status}
                          </Badge>
                          <Badge className={getSeverityColor(result.severity)}>
                            {result.severity}
                          </Badge>
                        </div>
                      </div>

                      {/* Description */}
                      <p className="text-orange-700">{result.description}</p>

                      {/* Check Details */}
                      <div className="bg-white p-3 rounded-md">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="font-medium text-orange-900">Check ID:</span>{" "}
                            <span className="text-orange-700">{result.check_id}</span>
                          </div>
                          {result.status_code && (
                            <div>
                              <span className="font-medium text-orange-900">Status Code:</span>{" "}
                              <span className="text-orange-700">{result.status_code}</span>
                            </div>
                          )}
                          <div>
                            <span className="font-medium text-orange-900">Target:</span>{" "}
                            <span className="text-orange-700 capitalize">{result.target}</span>
                          </div>
                        </div>
                      </div>

                      {/* Details */}
                      {result.details && (
                        <div className="bg-gray-50 p-3 rounded-md">
                          <h6 className="font-medium text-orange-900 mb-1">Details</h6>
                          <p className="text-sm text-orange-700">{result.details}</p>
                        </div>
                      )}

                      {/* Recommendation */}
                      {result.recommendation && (
                        <div className="bg-blue-50 p-3 rounded-md">
                          <h6 className="font-medium text-orange-900 mb-1">Recommendation</h6>
                          <p className="text-sm text-orange-700">{result.recommendation}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
