
"use client";

import type React from 'react';
import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import logoImage from '@/image/iconologo.png'; 
import logotexto from '@/image/logoo.png';

import Footer from '@/components/ui/footer';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader as DesktopSidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
} from "../components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Toaster } from "@/components/ui/toaster";
import { Home, Settings, CreditCard, User as UserIcon, CalendarDays, Heart, UploadCloud, Search as SearchIcon, UserCircle, X as XIcon, Eye, EyeOff, ChevronLeft, ChevronRight, LogIn, Dumbbell, Menu, ArrowRight, Building, Waves, LayoutGrid, FileText, ShieldCheck } from "lucide-react"; // Added missing icons

import { Button } from '@/components/ui/button';
import { cn } from "@/lib/utils";
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/context/AuthContext';


const navegacion = [
  {
    title: "Servicios Job",
    href: "/",
    icon: Home,
    tooltip: "Explora servicios profesionales"
  },
  {
    title: "Espacios Deportivos",
    href: "/sports-facilities",
    icon: Building,
    tooltip: "Encuentra instalaciones deportivas"
  },
  {
    title: "Publicar",
    href: "/post-job",
    icon: UploadCloud,
    tooltip: "Publica tus servicios o espacios"
  },
  {
    title: "Mis Reservas",
    href: "/book-service",
    icon: CalendarDays,
    tooltip: "Gestiona tus reservas"
  },
  {
    title: "Mis Favoritos",
    href: "/favorites",
    icon: Heart,
    tooltip: "Servicios y espacios guardados"
  },
  {
    title: "Facturación",
    href: "/billing",
    icon: CreditCard,
    tooltip: "Consulta tu historial de facturación"
  },
  {
    title: "Configuración",
    href: "/settings",
    icon: Settings,
    tooltip: "Ajusta tu perfil y preferencias"
  },
];

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const router = useRouter();
  const {
    user,
    isLoggedIn,
    // Removed dialog-specific states: showLoginDialog, showProfileDialog
    // Removed dialog-specific handlers: handleOpenChange
    // openLoginDialog, openProfileDialog, // These will be replaced by navigation or different actions
    handleLogout,
   } = useAuth();
  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false);
  
  const handleMobileSheetOpenChange = (open: boolean) => {
    setIsMobileSheetOpen(open);
  };

  const navigateToLogin = () => {
    setIsMobileSheetOpen(false); // Close sheet if open
    router.push('/login');
  };

  const navigateToSettingsOrOpenProfile = () => {
    setIsMobileSheetOpen(false);
    if (isLoggedIn && user) {
        router.push('/settings'); // Or open a profile summary if that's still desired
    } else {
        router.push('/login');
    }
  };


  return (
      <>
          <div className="flex h-screen overflow-hidden">
            <Sidebar className="hidden lg:flex flex-col flex-shrink-0 border-r bg-sidebar text-sidebar-foreground" side="left" variant="sidebar" collapsible="icon">
               <DesktopSidebarHeader className="p-2 border-b flex items-center gap-2 justify-start group-data-[collapsible=icon]:justify-center flex-shrink-0 h-14">
                  <Image
                      src={logotexto}
                      alt="Sportoffice Logo"
                      className="h-8 w-auto group-data-[collapsible=icon]:h-7 group-data-[collapsible=icon]:w-auto transition-all"
                      data-ai-hint="sportoffice logo"
                      priority
                  />
              </DesktopSidebarHeader>
              <SidebarContent className="flex-grow p-2 overflow-y-auto">
                <SidebarMenu>
                  {navegacion.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        href={item.href}
                        isActive={pathname === item.href}
                        tooltip={item.tooltip}
                        className={cn(
                           "h-10 p-2 text-sidebar-foreground",
                           pathname === item.href
                            ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                            : "hover:bg-sidebar-accent/10"
                        )}
                      >
                        <item.icon className="h-4 w-4" />
                         <span className="overflow-hidden whitespace-nowrap transition-opacity duration-200 group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:sr-only">
                            {item.title}
                        </span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarContent>
              <SidebarFooter className="p-2 border-t flex flex-col gap-2 flex-shrink-0">
                {isLoggedIn && user ? (
                   <Button asChild variant="ghost" className="flex items-center gap-2 cursor-pointer hover:bg-sidebar-accent/10 p-1 rounded-md overflow-hidden w-full justify-start group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:h-9 group-data-[collapsible=icon]:w-9 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:rounded-md">
                    <Link href="/settings">
                        <Avatar className="h-8 w-8 flex-shrink-0 group-data-[collapsible=icon]:h-7 group-data-[collapsible=icon]:w-7">
                        <AvatarImage src={user.avatarUrl || undefined} alt={user.name} data-ai-hint="user avatar placeholder" />
                        <AvatarFallback>{user.initials}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col text-sm text-left transition-opacity duration-200 group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:sr-only">
                        <span className="font-semibold truncate">{user.name}</span>
                        </div>
                    </Link>
                  </Button>
                ) : (
                   <Button
                     asChild
                     variant="accent"
                     className="w-full justify-start text-sm h-10 px-3 py-2 bg-accent text-accent-foreground hover:bg-accent/90 group-data-[collapsible=icon]:h-9 group-data-[collapsible=icon]:w-9 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:rounded-md group-data-[collapsible=icon]:justify-center"
                   >
                    <Link href="/login">
                       <ArrowRight className="mr-2 h-4 w-4 group-data-[collapsible=icon]:mr-0" />
                       <span className="overflow-hidden whitespace-nowrap transition-opacity duration-200 group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:sr-only">
                         Ingresar / Crear Cuenta
                       </span>
                       <span className="sr-only group-data-[collapsible!=icon]:hidden">
                         Ingresar
                       </span>
                    </Link>
                   </Button>
                )}
              </SidebarFooter>
            </Sidebar>

            <div className="flex flex-col flex-1 overflow-hidden">
               <header className="sticky top-0 z-10 flex h-14 items-center justify-start border-b bg-background px-3 sm:px-4 lg:hidden flex-shrink-0">
                  <Sheet open={isMobileSheetOpen} onOpenChange={handleMobileSheetOpenChange}>
                      <SheetTrigger asChild>
                        <Button variant="ghost" size="icon" className="-ml-2 sm:ml-0">
                           <Menu className="h-5 w-5 sm:h-6 sm:w-6" />
                          <span className="sr-only">Alternar menú</span>
                        </Button>
                      </SheetTrigger>
                       <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-2">
                          <Image
                            src={logoImage}
                            alt="Sportoffice Logo"
                            className="h-7 sm:h-8 w-auto"
                            data-ai-hint="sportoffice logo small"
                            priority
                          />
                           <h3 className="font-semibold text-primary text-base sm:text-lg leading-none">Sportoffice</h3>
                      </div>
                      <SheetContent side="left" className="w-60 p-0 bg-sidebar text-sidebar-foreground flex flex-col">
                           <SheetHeader className="p-4 border-b flex items-center justify-between h-14 flex-shrink-0">
                               <div className="flex items-center gap-2">
                                <Image src={logoImage} alt="Sportoffice Logo" className="h-8 w-auto" data-ai-hint="sportoffice logo menu" priority />
                                 <SheetTitle className="text-lg font-semibold text-primary">Sportoffice</SheetTitle>
                               </div>
                               <SheetClose asChild>
                                  <Button variant="ghost" size="icon" className="text-sidebar-foreground">
                                    <XIcon className="h-5 w-5" />
                                    <span className="sr-only">Cerrar menú</span>
                                  </Button>
                                </SheetClose>
                          </SheetHeader>
                          <ScrollArea className="flex-grow">
                              <SidebarContent className="p-2">
                                   <SidebarMenu>
                                      {navegacion.map((item) => (
                                      <SidebarMenuItem key={item.title}>
                                          <SidebarMenuButton
                                              href={item.href}
                                              isActive={pathname === item.href}
                                              onClick={() => setIsMobileSheetOpen(false)}
                                              className={cn(
                                                "text-sm h-10 px-3 text-sidebar-foreground",
                                                 pathname === item.href ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : "hover:bg-sidebar-accent/10"
                                              )}
                                          >
                                              <item.icon className="h-4 w-4" />
                                              {item.title}
                                          </SidebarMenuButton>
                                      </SidebarMenuItem>
                                      ))}
                                   </SidebarMenu>
                              </SidebarContent>
                          </ScrollArea>
                           <SidebarFooter className="p-2 border-t flex-shrink-0">
                               {isLoggedIn && user ? (
                                    <Button variant="ghost" onClick={navigateToSettingsOrOpenProfile} className="flex items-center gap-2 p-1 rounded-md w-full justify-start">
                                        <Avatar className="h-8 w-8"><AvatarImage src={user.avatarUrl || undefined} alt={user.name} data-ai-hint="user avatar small" /><AvatarFallback>{user.initials}</AvatarFallback></Avatar>
                                        <span className="font-medium truncate">{user.name}</span>
                                    </Button>
                                ) : (
                                    <Button
                                      onClick={navigateToLogin}
                                      variant="accent"
                                      className="w-full justify-start h-10 px-3 bg-accent text-accent-foreground hover:bg-accent/90"
                                    >
                                       <ArrowRight className="mr-2 h-4 w-4" /> Ingresar / Crear Cuenta
                                    </Button>
                                )}
                           </SidebarFooter>
                      </SheetContent>
                  </Sheet>
               </header>

              <SidebarInset className="flex-1 overflow-auto flex flex-col">
                  <div className="flex-grow">
                    {children}
                  </div>
               <Footer /> 
              </SidebarInset>
            </div>
          </div>
          {/* Dialog for auth removed, handled by pages now */}
          <Toaster />
      </>
  );
}
