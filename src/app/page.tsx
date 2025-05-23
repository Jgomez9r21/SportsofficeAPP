
"use client";

import type React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import AppLayout from '@/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, Search, Sparkles, Building, Users, Briefcase, Activity } from 'lucide-react'; // Added Briefcase and Activity

const HomePageContent = () => {
  return (
    <div className="flex flex-col flex-grow">
      {/* Hero Section */}
      <section className="py-12 md:py-20 lg:py-28 bg-gradient-to-br from-primary/5 via-background to-background">
        <div className="container mx-auto px-4 text-center">
          <div className="flex justify-center mb-6">
             <Image src="/_next/image?url=%2Fimage%2Ficonologo.png&w=64&q=75" alt="Sportoffice Logo" width={64} height={64} data-ai-hint="app logo sport" />
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground mb-6">
            Sport<span className="text-primary">office</span>: Conecta, Reserva, Disfruta
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-10">
            Tu plataforma ideal para encontrar y reservar servicios profesionales y espacios deportivos de manera fácil, rápida y segura.
          </p>
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
            <Button asChild size="lg" className="text-base px-8 py-6 shadow-lg hover:shadow-xl transition-shadow">
              <Link href="/#services-section">
                Explorar Servicios <Briefcase className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="text-base px-8 py-6 shadow-lg hover:shadow-xl transition-shadow border-primary text-primary hover:bg-primary/5">
              <Link href="/sports-facilities">
                Buscar Espacios <Activity className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services-section" className="py-12 md:py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-semibold text-foreground">Servicios Destacados</h2>
            <p className="text-muted-foreground mt-2">Encuentra profesionales para cada necesidad y lleva tus proyectos al siguiente nivel.</p>
          </div>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="hover:shadow-lg transition-shadow overflow-hidden">
              <CardHeader className="p-0">
                <div className="relative aspect-[16/9] w-full">
                    <Image src="https://placehold.co/600x400.png" alt="Desarrollo Web Frontend" layout="fill" objectFit="cover" data-ai-hint="web development interface" />
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <CardTitle className="text-lg mb-1">Desarrollo Web Frontend</CardTitle>
                <CardDescription className="text-sm mb-2 line-clamp-2">Creación de interfaces interactivas y responsivas para tu sitio web.</CardDescription>
                <p className="text-sm text-muted-foreground">Tarifa desde: <span className="font-semibold text-foreground">$75,000/hr</span></p>
              </CardContent>
              <CardFooter className="p-4 border-t">
                <Button asChild className="w-full">
                  <Link href="/service/2">Ver Detalles</Link>
                </Button>
              </CardFooter>
            </Card>
            <Card className="hover:shadow-lg transition-shadow overflow-hidden">
              <CardHeader className="p-0">
                <div className="relative aspect-[16/9] w-full">
                    <Image src="https://placehold.co/600x400.png" alt="Entrenamiento Fitness Personalizado" layout="fill" objectFit="cover" data-ai-hint="fitness training person" />
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <CardTitle className="text-lg mb-1">Entrenamiento Fitness Personalizado</CardTitle>
                <CardDescription className="text-sm mb-2 line-clamp-2">Planes personalizados para tus objetivos de fitness. Sesiones individuales/grupales.</CardDescription>
                <p className="text-sm text-muted-foreground">Tarifa desde: <span className="font-semibold text-foreground">$50,000/hr</span></p>
              </CardContent>
              <CardFooter className="p-4 border-t">
                <Button asChild className="w-full">
                  <Link href="/service/3">Ver Detalles</Link>
                </Button>
              </CardFooter>
            </Card>
            <Card className="hover:shadow-lg transition-shadow overflow-hidden">
              <CardHeader className="p-0">
                <div className="relative aspect-[16/9] w-full">
                    <Image src="https://placehold.co/600x400.png" alt="Servicios de Contratista General" layout="fill" objectFit="cover" data-ai-hint="construction contractor building" />
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <CardTitle className="text-lg mb-1">Servicios de Contratista General</CardTitle>
                <CardDescription className="text-sm mb-2 line-clamp-2">Remodelaciones, reparaciones y construcciones menores para su hogar o negocio.</CardDescription>
                <p className="text-sm text-muted-foreground">Tarifa desde: <span className="font-semibold text-foreground">$80,000/hr</span></p>
              </CardContent>
              <CardFooter className="p-4 border-t">
                <Button asChild className="w-full">
                  <Link href="/service/4">Ver Detalles</Link>
                </Button>
              </CardFooter>
            </Card>
          </div>
           <div className="text-center mt-12">
                <Button asChild variant="link" className="text-primary text-lg font-medium hover:text-primary/80">
                    <Link href="/#services-section"> {/* Link to the services section itself or a dedicated service catalog page */}
                        Ver todos los servicios <ArrowRight className="ml-2 h-5 w-5" />
                    </Link>
                </Button>
            </div>
        </div>
      </section>

      {/* How it works Section */}
      <section className="py-12 md:py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-semibold text-foreground">¿Cómo Funciona Sportoffice?</h2>
            <p className="text-muted-foreground mt-2">Encuentra lo que necesitas en 3 simples pasos.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="flex flex-col items-center p-6 bg-card rounded-xl shadow-lg hover:shadow-xl transition-shadow">
              <div className="p-4 bg-primary/10 rounded-full mb-4">
                <Search className="h-10 w-10 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-foreground">1. Busca y Descubre</h3>
              <p className="text-muted-foreground text-sm">Utiliza nuestros filtros avanzados para encontrar exactamente el servicio o espacio deportivo que buscas en tu área.</p>
            </div>
            <div className="flex flex-col items-center p-6 bg-card rounded-xl shadow-lg hover:shadow-xl transition-shadow">
              <div className="p-4 bg-primary/10 rounded-full mb-4">
                <Sparkles className="h-10 w-10 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-foreground">2. Conecta y Compara</h3>
              <p className="text-muted-foreground text-sm">Revisa perfiles detallados, calificaciones y contacta directamente con proveedores y propietarios para aclarar dudas.</p>
            </div>
            <div className="flex flex-col items-center p-6 bg-card rounded-xl shadow-lg hover:shadow-xl transition-shadow">
              <div className="p-4 bg-primary/10 rounded-full mb-4">
                <Users className="h-10 w-10 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-foreground">3. Reserva y Disfruta</h3>
              <p className="text-muted-foreground text-sm">Agenda y paga de forma segura a través de la plataforma. ¡Todo listo para disfrutar tu servicio o espacio!</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

const HomePage = () => {
  return (
    <AppLayout>
      <HomePageContent />
    </AppLayout>
  );
};

export default HomePage;

    