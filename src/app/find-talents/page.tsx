
"use client";

// This page's content has been moved to /sports-facilities
// It can be deleted or repurposed.

import type React from 'react';
import AppLayout from '@/layout/AppLayout';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

const FindTalentsMovedPage = () => {
  return (
    <AppLayout>
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <h1 className="text-2xl font-semibold mb-4">Página Movida</h1>
        <p className="mb-6 text-muted-foreground">
          El contenido de "Espacios Deportivos" ahora se encuentra en una nueva ruta.
        </p>
        <Button asChild>
          <Link href="/sports-facilities">Ir a Espacios Deportivos</Link>
        </Button>
      </div>
    </AppLayout>
  );
};

export default FindTalentsMovedPage;

    