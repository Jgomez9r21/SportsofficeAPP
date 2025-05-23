"use client";

import React from 'react';
import { 
  SidebarProvider, 
  Sidebar, 
  SidebarHeader, 
  SidebarContent, 
  SidebarFooter, 
  SidebarInset 
} from "@/components/ui/sidebar";
import Header from "@/components/layout/Header";
import SidebarNav from "@/components/layout/SidebarNav";
import { Toaster } from "@/components/ui/toaster";
import Link from 'next/link';
import { Sprout } from 'lucide-react';

export default function AppShell({ children }: { children: React.ReactNode }) {
  // The defaultOpen prop for SidebarProvider can be controlled by a cookie or user setting in a real app
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);

  return (
    <SidebarProvider open={isSidebarOpen} onOpenChange={setIsSidebarOpen} defaultOpen={true}>
      <Sidebar>
        <SidebarHeader className="p-4">
          <Link href="/" className="flex items-center gap-2 text-sidebar-foreground hover:text-sidebar-primary transition-colors">
            <Sprout className="h-8 w-8 text-sidebar-primary" />
            <h1 className="text-2xl font-semibold">SpaceFlow</h1>
          </Link>
        </SidebarHeader>
        <SidebarContent>
          <SidebarNav />
        </SidebarContent>
        <SidebarFooter className="p-2">
          {/* Optional: Sidebar footer content like settings or logout */}
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <Header />
        <main className="flex-1 p-4 md:p-6 bg-background overflow-y-auto">
          {children}
        </main>
      </SidebarInset>
      <Toaster />
    </SidebarProvider>
  );
}
