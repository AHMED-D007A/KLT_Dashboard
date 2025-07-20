"use client";

import { useState, useEffect } from "react";
import { DashboardToken } from "@/types/dashboard";

// Keep your existing interface - using 'lttoken' not 'dashboard'
interface SectionCardsProps {
  lttoken?: DashboardToken;
  currentVUCount?: number;
  stopped?: boolean;
  stopTime?: string;
}

function useElapsedTime(startTime: string | undefined, stopped: boolean = false) {
  const [elapsed, setElapsed] = useState("0s");

  useEffect(() => {
    if (!startTime || stopped) return;

    const updateElapsed = () => {
      const start = new Date(startTime).getTime();
      const now = Date.now();
      const diff = Math.max(0, Math.floor((now - start) / 1000));
      
      const hours = Math.floor(diff / 3600);
      const minutes = Math.floor((diff % 3600) / 60);
      const seconds = diff % 60;
      
      if (hours > 0) {
        setElapsed(`${hours}h ${minutes}m ${seconds}s`);
      } else if (minutes > 0) {
        setElapsed(`${minutes}m ${seconds}s`);
      } else {
        setElapsed(`${seconds}s`);
      }
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [startTime, stopped]);

  return elapsed;
}

export function SectionCards({ 
  lttoken, 
  currentVUCount = 0, 
  stopped = false, 
  stopTime 
}: SectionCardsProps) {
  const elapsedTime = useElapsedTime(lttoken?.created_at, stopped);

  if (!lttoken) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="text-center">
            <div className="text-2xl font-bold text-gray-400">--</div>
            <div className="text-sm text-gray-500">Select a dashboard</div>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Dynamic card data
  const cardData = [
    {
      label: "Profile",
      value: lttoken.load_options.Profile,
      color: "text-gray-600"
    },
    {
      label: "Active VUs",
      value: `${currentVUCount} / ${lttoken.load_options.VUs}`,
      color: "text-gray-600"
    },
    {
      label: "Target Duration",
      value: lttoken.load_options.Duration,
      color: "text-gray-600"
    },
    {
      label: stopped ? "Final Runtime" : "Elapsed Time",
      value: stopped ? (stopTime || "Stopped") : elapsedTime,
      color: stopped ? "text-red-600" : "text-blue-600"
    },
    {
      label: "Target RPS",
      value: lttoken.load_options.RPS.toLocaleString(),
      color: "text-gray-600"
    },
    {
      label: "Status",
      value: stopped ? "Completed" : "Running",
      color: stopped ? "text-red-600" : "text-green-600"
    }
  ];

  return (
    <div className="space-y-4">
      {/* Dashboard Info Header */}
      <div className="bg-white rounded-lg border p-4">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-xl font-semibold">{lttoken.title}</h2>
            <p className="text-gray-600 text-sm mt-1">{lttoken.description}</p>
            <p className="text-gray-500 text-xs mt-2">ID: {lttoken.id}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
            stopped 
              ? 'bg-red-100 text-red-800' 
              : 'bg-green-100 text-green-800'
          }`}>
            {stopped ? 'Completed' : 'Running'}
          </span>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {cardData.map((card) => (
          <Card key={card.label}>
            <CardHeader className="text-center">
              <div className={`text-2xl font-bold ${card.color}`}>
                {card.value}
              </div>
              <div className="text-sm text-gray-500">{card.label}</div>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}

// Simple Card Components
function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-lg border shadow-sm ${className}`}>
      {children}
    </div>
  );
}

function CardHeader({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`p-4 ${className}`}>
      {children}
    </div>
  );
}