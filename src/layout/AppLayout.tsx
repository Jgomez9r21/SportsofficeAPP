
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
import { Home, Settings, CreditCard, User as UserIcon, CalendarDays, Heart, UploadCloud, Menu, LogIn, LogOut, Building, Waves, LayoutGrid, FileText, ShieldCheck, X as XIcon, AlertTriangle, WifiOff } from "lucide-react"; // Added LogIn, LogOut, AlertTriangle, WifiOff

import { Button } from '@/components/ui/button';
import { cn } from "@/lib/utils";
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/context/AuthContext';

const navegacion = [
  { title: "Servicios Job", href: "/", icon: Home, tooltip: "Explora servicios profesionales" },
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
  const authContext = useAuth();
  const {
    user,
    isLoggedIn,
    handleLogout,
    isLoading,
    firebaseConfigError,
    openLoginDialog, // Assuming we might still use dialogs or for smooth transition
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
        <AlertTriangle className="h-16 w-16 text-destructive mb-6" />
        <h1 className="text-2xl font-bold text-destructive mb-3">Error Crítico de Configuración</h1>
        <p className="text-lg text-foreground mb-1">No se pudo inicializar Firebase.</p>
        <p className="text-muted-foreground mb-6 max-w-md">
          Una o más variables de entorno de Firebase (como `NEXT_PUBLIC_FIREBASE_API_KEY` o `NEXT_PUBLIC_FIREBASE_PROJECT_ID`) faltan o son incorrectas.
        </p>
        <div className="bg-muted p-4 rounded-md text-left text-sm max-w-lg mx-auto">
          <p className="font-semibold mb-2">Por favor, verifica lo siguiente:</p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>Que exista un archivo `.env.local` en la raíz de tu proyecto.</li>
            <li>Que todas las variables `NEXT_PUBLIC_FIREBASE_...` estén correctamente definidas en `.env.local` con los valores de tu proyecto Firebase.</li>
            <li>Que hayas **reiniciado tu servidor de desarrollo** después de crear o modificar el archivo `.env.local`.</li>
          </ul>
        </div>
        <Button onClick={() => window.location.reload()} className="mt-8">
          Intentar Recargar
        </Button>
        <Toaster />
      </div>
    );
  }

  if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
          <div className="flex flex-col items-center">
            <Image src={logoImage} alt="Sportoffice Logo" width={60} height={60} priority className="mb-4" data-ai-hint="logo sportoffice loading"/>
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
              <span className="text-lg font-medium text-muted-foreground">Cargando Sportoffice...</span>
            </div>
          </div>
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
                    <div className="flex flex-col items-start gap-2 w-full group-data-[collapsible=icon]:items-center">
                        <Button variant="ghost" onClick={() => router.push('/settings')} className="flex items-center gap-2 cursor-pointer hover:bg-sidebar-accent/10 p-1 rounded-md overflow-hidden w-full justify-start group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:h-9 group-data-[collapsible=icon]:w-9 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:rounded-md">
                            <Avatar className="h-8 w-8 flex-shrink-0 group-data-[collapsible=icon]:h-7 group-data-[collapsible=icon]:w-7">
                            <AvatarImage src={user.avatarUrl || undefined} alt={user.name} data-ai-hint="user avatar placeholder" />
                            <AvatarFallback>{user.initials}</AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col text-sm text-left transition-opacity duration-200 group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:sr-only">
                            <span className="font-semibold truncate">{user.name}</span>
                            </div>
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleLogout}
                            className="w-full text-xs h-8 justify-start text-sidebar-foreground hover:bg-sidebar-accent/20 group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:w-8 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:justify-center"
                         >
                            <LogOut className="mr-2 h-3.5 w-3.5 group-data-[collapsible=icon]:mr-0" />
                            <span className="overflow-hidden whitespace-nowrap transition-opacity duration-200 group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:sr-only">
                                Cerrar Sesión
                            </span>
                             <span className="sr-only group-data-[collapsible!=icon]:hidden">
                                 Cerrar Sesión
                             </span>
                        </Button>
                    </div>
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
                           <SidebarFooter className="p-2 border-t flex-shrink-0 space-y-2">
                               {isLoggedIn && user ? (
                                    <>
                                        <Button variant="ghost" onClick={() => { router.push('/settings'); setIsMobileSheetOpen(false); }} className="flex items-center gap-2 p-1 rounded-md w-full justify-start">
                                            <Avatar className="h-8 w-8"><AvatarImage src={user.avatarUrl || undefined} alt={user.name} data-ai-hint="user avatar small" /><AvatarFallback>{user.initials}</AvatarFallback></Avatar>
                                            <span className="font-medium truncate">{user.name}</span>
                                        </Button>
                                        <Button variant="outline" size="sm" onClick={() => {handleLogout(); setIsMobileSheetOpen(false);}} className="w-full text-xs h-9 text-sidebar-foreground hover:bg-sidebar-accent/20">
                                            <LogOut className="mr-2 h-4 w-4" /> Cerrar Sesión
                                        </Button>
                                    </>
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
