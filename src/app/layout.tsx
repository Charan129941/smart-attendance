import type { Metadata, Viewport } from 'next';
import './globals.css';

import PWARegister from '@/components/PWARegister';

export const metadata: Metadata = {
  title: 'Smart Attendance',
  description: 'Geolocation and QR-based attendance system',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Attendance',
  },
};

export const viewport: Viewport = {
  themeColor: '#0a0f1e',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <link rel="apple-touch-icon" href="/icon.jpg" />
      </head>
      <body className="antialiased" suppressHydrationWarning>
        <PWARegister />
        {children}
      </body>
    </html>
  );
}
