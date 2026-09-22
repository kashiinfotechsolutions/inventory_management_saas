import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Arun Ice Cream & Dairy Products | Inventory command center',
  description: 'Inventory, sales and stock control for modern retail teams.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
