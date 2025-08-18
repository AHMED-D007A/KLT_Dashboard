"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Trash2, Calendar, Clock, Users, Target, AreaChartIcon, Rabbit } from "lucide-react";
import { DashboardToken } from "@/types/dashboard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function DashboardListPage() {
  const router = useRouter();
  const [dashboards, setDashboards] = useState<DashboardToken[]>([]);

  const deleteDashboard = (dashboardId: string) => {
    setDashboards((prevDashboards) => {
      const updatedDashboards = prevDashboards.filter(d => d.id !== dashboardId);
      localStorage.setItem("klt-dashboards", JSON.stringify(updatedDashboards));
      return updatedDashboards;
    });

    // Clean up dashboard-specific data
    try {
      const dashboardSpecificKey = `dashboard-storage-dashboard-${dashboardId}`;
      localStorage.removeItem(dashboardSpecificKey);
    } catch (error) {
      console.error('Failed to clean up dashboard data:', error);
    }
  };

  const openDashboard = (dashboardId: string) => {
    router.push(`/?dashboard=${dashboardId}`);
  };

  const openDashboardInNewTab = (dashboardId: string) => {
    const url = new URL(window.location.origin);
    url.searchParams.set('dashboard', dashboardId);
    window.open(url.toString(), '_blank');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatDuration = (duration: string) => {
    // Convert duration string like "30s", "5m", "1h" to human readable format
    return duration;
  };

  useEffect(() => {
    // Load from localStorage on mount
    const savedDashboards = localStorage.getItem("klt-dashboards");
    if (savedDashboards) {
      try {
        const parsed = JSON.parse(savedDashboards);
        setDashboards(parsed);
      } catch (error) {
        console.error("Failed to parse saved dashboards:", error);
      }
    }
  }, []);

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-orange-900 mb-2">
            KLT Dashboard
          </h1>
          <p className="text-orange-700 text-lg">
            Manage and monitor your load testing dashboards
          </p>
        </div>

        {/* Status Info */}
        <div className="mb-6">
          <div className="text-sm text-orange-600">
            {dashboards.length} dashboard{dashboards.length !== 1 ? 's' : ''} available
          </div>
        </div>

        {/* Dashboard Grid */}
        {dashboards.length === 0 ? (
          <Card className="p-12 text-center border-orange-200">
            <div className="text-orange-400 mb-4">
              <AreaChartIcon className="w-16 h-16 mx-auto mb-4" />
            </div>
            <h3 className="text-xl font-semibold text-orange-800 mb-2">
              No dashboards available
            </h3>
            <p className="text-orange-600 mb-6">
              Dashboards will appear here automatically when load tests are running
            </p>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {dashboards.map((dashboard) => (
              <Card key={dashboard.id} className="p-6 hover:shadow-lg transition-shadow border-orange-200 hover:border-orange-300">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-semibold text-orange-900 truncate">
                    {dashboard.title}
                  </h3>
                  <div className="flex gap-2 ml-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openDashboardInNewTab(dashboard.id)}
                      className="p-2 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteDashboard(dashboard.id)}
                      className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <p className="text-orange-700 text-sm mb-4 line-clamp-2">
                  {dashboard.description}
                </p>

                <div className="space-y-2 mb-4 text-sm text-orange-600">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>{formatDate(dashboard.created_at)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    <span>{dashboard.load_options.VUs} VUs</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span>{formatDuration(dashboard.load_options.Duration)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    <span>{dashboard.load_options.RPS} RPS</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Button
                    onClick={() => openDashboard(dashboard.id)}
                    className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                  >
                    Open Dashboard
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
