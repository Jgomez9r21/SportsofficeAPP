
// Esta página se ha dejado intencionalmente en blanco o con un componente mínimo
// según la solicitud del usuario para revertir la funcionalidad anterior.
"use client";

import type React from 'react';
import AppLayout from '@/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { ImageIcon } from 'lucide-react'; // Corrected icon name

const GenerateImagePagePlaceholderContent = () => {
  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-3xl mx-auto">
      <div className="flex flex-col justify-center items-center h-64 border-2 border-dashed rounded-lg bg-muted/30 text-muted-foreground">
        <ImageIcon className="h-16 w-16 mb-4 text-muted-foreground/70" />
        <p className="text-sm font-medium">Funcionalidad de generación de imágenes eliminada.</p>
        <Button variant="link" className="mt-2" onClick={() => window.history.back()}>
          Volver
        </Button>
      </div>
    </div>
  );
};

export default function GenerateImagePage() {
  return (
    <AppLayout>
      <GenerateImagePagePlaceholderContent />
    </AppLayout>
  );
}
