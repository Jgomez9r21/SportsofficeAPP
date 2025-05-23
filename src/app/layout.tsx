import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import './globals.css';
import AppShell from '@/components/layout/AppShell';

export const metadata: Metadata = {
  title: 'SpaceFlow',
  description: 'Book sports fields and workspaces effortlessly.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${GeistSans.variable} ${GeistMono.variable} font-sans antialiased`}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
