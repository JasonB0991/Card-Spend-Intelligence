"use client";

import { useState } from "react";
import AppSidebar from "@/components/AppSidebar";

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#f3f6f2]">
      <AppSidebar
        isCollapsed={isSidebarCollapsed}
        onToggle={() => setIsSidebarCollapsed((prev) => !prev)}
      />
      <main className="min-w-0 flex-1 overflow-hidden bg-[#f8faf7]">
        {children}
      </main>
    </div>
  );
}