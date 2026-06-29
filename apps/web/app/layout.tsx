import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ToqWow — 366 Mundos para Explorar',
  description: 'Una app de juego libre para ninos de 2 a 10 anos. Toca, descubri, juga!',
  manifest: '/manifest.json',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <meta name="theme-color" content="#7C6AE8" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
      </head>
      <body style={{ margin: 0, background: '#7C6AE8', overflow: 'hidden', height: '100dvh' }}>
        {children}
      </body>
    </html>
  );
}
