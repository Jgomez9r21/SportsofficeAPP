
"use client";

// This page's content has been moved to the main page ('/')
// It can be deleted or repurposed.

import type React from 'react';
import AppLayout from '@/layout/AppLayout';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

const ServicesLandingMovedPage = () => {
  return (
    <AppLayout>
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <h1 className="text-2xl font-semibold mb-4">Página Movida</h1>
        <p className="mb-6 text-muted-foreground">
          El contenido de "Servicios Independientes" ahora se encuentra en la página principal.
        </p>
        <Button asChild>
          <Link href="/">Ir a Inicio (Servicios Independientes)</Link>
        </Button>
      </div>
    </AppLayout>
  );
};

export default ServicesLandingMovedPage;

    