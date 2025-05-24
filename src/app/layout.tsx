/**
 * Nombre del archivo: RootLayout.tsx
 *
 * Propósito:
 * Este archivo define el esqueleto principal de toda la aplicación. Contiene configuraciones globales como fuentes tipográficas,
 * proveedores de contexto de autenticación y sidebar, y establece el layout base que envuelve todas las páginas.
 *
 * Autores:
 * - Kevin Lopez
 * - Vanesa Caminos
 * - Juan Pablo Gomez
 */

// Importaciones necesarias
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Body } from '@/layout/app';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AuthProvider } from '@/context/AuthContext';

// Configuración de las fuentes tipográficas
const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

// Metadatos globales de la aplicación
export const metadata: Metadata = {
  title: 'Sportoffice',
  description: 'Conéctate con proveedores de servicios locales y reserva servicios con facilidad.',
};

/**
 * Nombre del método: RootLayout
 *
 * Propósito:
 * Función que define el layout raíz de la aplicación. Envuelve todo el contenido de la aplicación con proveedores de contexto
 * y configuraciones globales, asegurando que estén disponibles en todas las páginas.
 *
 * Variables utilizadas:
 * - children: El contenido específico de cada página que se renderiza dentro del layout
 *
 * Precondición:
 * - El componente debe ser usado como layout principal de la aplicación
 *
 * Postcondición:
 * - Se devuelve una estructura HTML completa con contexto de autenticación, sidebar y estilo global aplicado
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {/* Proveedor de contexto de autenticación */}
        <AuthProvider>
          {/* Proveedor de contexto para el sidebar */}
          <SidebarProvider>
            {/* Layout base personalizado */}
            <Body>{children}</Body>
          </SidebarProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
