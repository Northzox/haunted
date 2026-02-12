import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: '👁️ Haunted Crd',
  description: 'A Discord-style platform focused on anonymity, privacy, and pure darkness aesthetic.',
  icons: {
    icon: '/images/logo.png',
    shortcut: '/images/logo.png',
    apple: '/images/logo.png',
  },
  openGraph: {
    title: '👁️ Haunted Crd',
    description: 'A Discord-style platform focused on anonymity, privacy, and pure darkness aesthetic.',
    images: ['/images/logo.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: '👁️ Haunted Crd',
    description: 'A Discord-style platform focused on anonymity, privacy, and pure darkness aesthetic.',
    images: ['/images/logo.png'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="bg-black text-text-primary">
      <body className={inter.className}>
        <div id="root" className="min-h-screen bg-black">
          {children}
        </div>
      </body>
    </html>
  );
}
