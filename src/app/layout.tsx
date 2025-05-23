
import type {Metadata} from 'next';
import {Geist, Geist_Mono} from 'next/font/google';
import './globals.css';
import { Body } from '@/layout/app';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AuthProvider } from '@/context/AuthContext';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Sportoffice',
  description: 'Conéctate con proveedores de servicios locales y reserva servicios con facilidad.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es"><body className={`${geistSans.variable} ${geistMono.variable} antialiased`}><AuthProvider><SidebarProvider><Body>{children}</Body></SidebarProvider></AuthProvider></body></html>
  );
}
