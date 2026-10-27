import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Laptop Collection & Room Allocation System | RGUKT',
  description:
    'Production-ready operational sequential room allocation and collection system for CSE and ECE departments.',
  icons: {
    icon: [
      { url: '/Rgukt_Logo.png' },
      { url: '/icon.png' },
    ],
    shortcut: '/Rgukt_Logo.png',
    apple: '/Rgukt_Logo.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full bg-[#F7F8FA]">
      <body className="min-h-full flex flex-col font-sans antialiased text-[#1A1A1A] bg-[#F7F8FA]">
        {children}
      </body>
    </html>
  );
}
