"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton } from "@/components/ui/sidebar";
import { LayoutGrid, CalendarCheck, Sparkles, Settings } from "lucide-react";

const navItems = [
  { href: "/", label: "Browse Spaces", icon: LayoutGrid },
  { href: "/reservations", label: "My Reservations", icon: CalendarCheck },
  { href: "/recommendations", label: "Get Recommendations", icon: Sparkles },
];

export default function SidebarNav() {
  const pathname = usePathname();

  return (
    <SidebarMenu>
      {navItems.map((item) => (
        <SidebarMenuItem key={item.href}>
          <SidebarMenuButton
            asChild
            isActive={pathname === item.href}
            tooltip={{ children: item.label, side: "right", align: "center" }}
          >
            <Link href={item.href}>
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
       {/* Example of a separator and additional item */}
       {/* <SidebarSeparator />
       <SidebarMenuItem>
        <SidebarMenuButton
          asChild
          isActive={pathname === "/settings"}
          tooltip={{ children: "Settings", side: "right", align: "center" }}
        >
          <Link href="/settings">
            <Settings className="h-5 w-5" />
            <span>Settings</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem> */}
    </SidebarMenu>
  );
}
