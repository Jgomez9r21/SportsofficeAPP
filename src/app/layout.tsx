import type { Metadata } from 'next';
import { Geist_Sans, Geist_Mono } from 'next/font/google'; // Corrected import name
import './globals.css';
import AppShell from '@/components/layout/AppShell';

const geistSans = Geist_Sans({ // Corrected variable name
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

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
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
