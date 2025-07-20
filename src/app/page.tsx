"use client";

import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/dashboard_sidebar";
import { DashboardProvider, useDashboard } from "@/context/dashboard_context";

function DashboardContent() {
  const { selectedDashboard, setSelectedDashboard } = useDashboard();

  return (
    <SidebarProvider>
      <DashboardSidebar 
        selectedDashboard={selectedDashboard}
        onSelectDashboard={setSelectedDashboard}
      />
      
      <SidebarInset>
        {/* Header */}
        <header className="flex h-17 items-center gap-1 border-b px-4">
          <SidebarTrigger />
          <h1 className="text-lg font-semibold">
            {selectedDashboard ? selectedDashboard.title : 'Select a Dashboard'}
          </h1>
        </header>

        {/* Main Content */}
        <div className="p-6">
          {selectedDashboard ? (
            <div className="space-y-6">
              <div className="text-center text-gray-500">
                Dashboard content will go here
              </div>
              <pre className="bg-gray-100 p-4 rounded text-sm">
                {JSON.stringify(selectedDashboard, null, 2)}
              </pre>
            </div>
          ) : (
            <div className="text-center text-gray-500 py-12">
              Select a dashboard from the sidebar to get started
            </div>
          )}
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