"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// Context for sidebar state
type SidebarContextProps = {
  isOpen: boolean;
  toggle: () => void;
};

const SidebarContext = React.createContext<SidebarContextProps | null>(null);

export function useSidebar() {
  const context = React.useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
}

// Sidebar Provider
export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = React.useState(true);
  
  const toggle = () => setIsOpen(!isOpen);

  return (
    <SidebarContext.Provider value={{ isOpen, toggle }}>
      <div className="flex h-screen">{children}</div>
    </SidebarContext.Provider>
  );
}

// Main Sidebar Component
export function Sidebar({ 
  children, 
  className 
}: { 
  children: React.ReactNode;
  className?: string;
}) {
  const { isOpen } = useSidebar();

  return (
    <div
      className={cn(
        "bg-orange-50 border-r border-orange-200 transition-all duration-300",
        isOpen ? "w-64" : "w-16",
        className
      )}
    >
      {children}
    </div>
  );
}

// Sidebar Header
export function SidebarHeader({ 
  children, 
  className 
}: { 
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("p-4 border-b border-orange-200", className)}>
      {children}
    </div>
  );
}

// Sidebar Content
export function SidebarContent({ 
  children, 
  className 
}: { 
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex-1 overflow-y-auto p-4", className)}>
      {children}
    </div>
  );
}

// Sidebar Trigger (toggle button)
export function SidebarTrigger({ className }: { className?: string }) {
  const { toggle } = useSidebar();

  return (
    <Button
      onClick={toggle}
      variant="ghost"
      size="sm"
      className={cn("p-1 cursor-pointer", className)}
    >
      <svg
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 6h16M4 12h16M4 18h16"
        />
      </svg>
    </Button>
  );
}

// Main Content Area
export function SidebarInset({ 
  children, 
  className 
}: { 
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <main className={cn("flex-1 overflow-auto", className)}>
      {children}
    </main>
  );
}