import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Plim Plim — Paid Media Dashboard',
  description: 'Dashboard de paid media en tiempo real conectado al Meta Marketing API',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="font-body">{children}</body>
    </html>
  );
}
