
"use client";

import type React from 'react';
import { useState, useEffect, useRef } from 'react';
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
import { Home, Settings, CreditCard, User as UserIcon, CalendarDays, Heart, UploadCloud, Menu, LogIn, Building, Waves, LayoutGrid, FileText, ShieldCheck, X as XIcon, AlertTriangle, PackageSearch } from "lucide-react";

import { Button } from '@/components/ui/button';
import { cn } from "@/lib/utils";
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/context/AuthContext';

const navegacion = [
  { title: "Servicios Job", href: "/", icon: PackageSearch, tooltip: "Explora servicios profesionales" },
  { title: "Espacios Deportivos", href: "/sports-facilities", icon: Building, tooltip: "Encuentra instalaciones deportivas" },
  { title: "Publicar", href: "/post-job", icon: UploadCloud, tooltip: "Publica tus servicios o espacios" },
  { title: "Mis Reservas", href: "/book-service", icon: CalendarDays, tooltip: "Gestiona tus reservas" },
  { title: "Mis Favoritos", href: "/favorites", icon: Heart, tooltip: "Servicios y espacios guardados" },
  { title: "Facturación", href: "/billing", icon: CreditCard, tooltip: "Consulta tu historial de facturación" },
  { title: "Configuración", href: "/settings", icon: Settings, tooltip: "Ajusta tu perfil y preferencias" },
];

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const router = useRouter();
  const authContext = useAuth(); // Get the whole context

  // If context is not yet available (e.g., during initial SSR or if AuthProvider hasn't mounted)
  // show a global loading state or a minimal layout.
  if (!authContext) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
        <svg className="animate-spin h-10 w-10 text-primary mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className="text-muted-foreground">Cargando aplicación...</p>
        <Toaster />
      </div>
    );
  }

  const {
    user,
    isLoggedIn,
    isLoading, // Use isLoading from context
    firebaseConfigError, // Use firebaseConfigError from context
  } = authContext;

  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false);

  const handleMobileSheetOpenChange = (open: boolean) => {
    setIsMobileSheetOpen(open);
  };

  const authPaths = ['/login', '/signup', '/forgot-password'];
  if (authPaths.includes(pathname)) {
    return <>{children}<Toaster /></>;
  }

  if (firebaseConfigError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4 text-center">
        <AlertTriangle className="h-16 w-16 text-destructive mb-4" />
        <h1 className="text-2xl font-bold text-destructive mb-2">Error Crítico de Configuración</h1>
        <p className="text-foreground mb-1">La aplicación no puede conectarse a los servicios de Firebase.</p>
        <p className="text-muted-foreground mb-4 max-w-md">
          Por favor, asegúrate de que las variables de entorno de Firebase (<code>NEXT_PUBLIC_FIREBASE_API_KEY</code>, <code>NEXT_PUBLIC_FIREBASE_PROJECT_ID</code>, etc.) estén correctamente configuradas en tu archivo <code>.env.local</code> y que hayas reiniciado el servidor de desarrollo.
        </p>
        <Button onClick={() => window.location.reload()}>
          Intentar Recargar
        </Button>
        <Toaster />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
        <svg className="animate-spin h-10 w-10 text-primary mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className="text-muted-foreground">Cargando...</p>
        <Toaster />
      </div>
    );
  }

  return (
      <>
          <div className="flex h-screen overflow-hidden">
            <Sidebar className="hidden lg:flex flex-col flex-shrink-0 border-r bg-sidebar text-sidebar-foreground" side="left" variant="sidebar" collapsible="icon">
               <DesktopSidebarHeader className="p-2 border-b flex items-center gap-2 justify-start group-data-[collapsible=icon]:justify-center flex-shrink-0 h-14">
                  <Image
                      src={logotexto}
                      alt="Sportoffice Logo"
                      className="h-8 w-auto group-data-[collapsible=icon]:h-7 group-data-[collapsible=icon]:w-auto transition-all"
                      data-ai-hint="logo sportoffice"
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
                  <Button variant="ghost" onClick={() => router.push('/settings')} className="flex items-center gap-2 cursor-pointer hover:bg-sidebar-accent/10 p-1 rounded-md overflow-hidden w-full justify-start group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:h-9 group-data-[collapsible=icon]:w-9 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:rounded-md">
                    <Avatar className="h-8 w-8 flex-shrink-0 group-data-[collapsible=icon]:h-7 group-data-[collapsible=icon]:w-7">
                      <AvatarImage src={user.avatarUrl || undefined} alt={user.name} data-ai-hint="user avatar placeholder" />
                      <AvatarFallback>{user.initials}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col text-sm text-left transition-opacity duration-200 group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:sr-only">
                      <span className="font-semibold truncate">{user.name}</span>
                    </div>
                  </Button>
                ) : (
                   <Button
                     asChild
                     variant="accent"
                     className="w-full justify-start text-sm h-10 px-3 py-2 bg-accent text-accent-foreground hover:bg-accent/90 group-data-[collapsible=icon]:h-9 group-data-[collapsible=icon]:w-9 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:rounded-md group-data-[collapsible=icon]:justify-center"
                   >
                     <Link href="/login">
                       <LogIn className="mr-2 h-4 w-4 group-data-[collapsible=icon]:mr-0" />
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
                                    <Button variant="ghost" onClick={() => { router.push('/settings'); setIsMobileSheetOpen(false); }} className="flex items-center gap-2 p-1 rounded-md w-full justify-start">
                                        <Avatar className="h-8 w-8"><AvatarImage src={user.avatarUrl || undefined} alt={user.name} data-ai-hint="user avatar small" /><AvatarFallback>{user.initials}</AvatarFallback></Avatar>
                                        <span className="font-medium truncate">{user.name}</span>
                                    </Button>
                                ) : (
                                    <Button
                                      asChild
                                      variant="accent"
                                      className="w-full justify-start h-10 px-3 bg-accent text-accent-foreground hover:bg-accent/90"
                                      onClick={() => setIsMobileSheetOpen(false)}
                                    >
                                       <Link href="/login">
                                         <LogIn className="mr-2 h-4 w-4" /> Ingresar / Crear Cuenta
                                       </Link>
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
          <Toaster />
      </>
  );
}
