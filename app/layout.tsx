import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'TextFlick Studio',
  description: 'Create AI-powered chat stories for short-form video.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
