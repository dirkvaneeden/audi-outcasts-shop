import type { Metadata, Viewport } from 'next';
import { ShellBar } from '@/components/ShellBar';
import './globals.css';

export const metadata: Metadata = {
  title: 'Audi Outcasts Store',
  description: 'Store administration',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#354a5f',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ShellBar />
        <main className="app-content">{children}</main>
      </body>
    </html>
  );
}
