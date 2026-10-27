import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Laptop Collection & Room Allocation System',
  description: 'Production-ready operational sequential room allocation and collection system for CSE and ECE departments.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full bg-slate-50">
      <body className="min-h-full flex flex-col font-sans antialiased text-slate-900 bg-slate-50">
        {children}
      </body>
    </html>
  );
}
