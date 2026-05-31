import { Inter } from 'next/font/google';
import { Lusitana } from 'next/font/google';
 
export const inter = Inter({ subsets: ['latin'] });
export const lusitana = Lusitana({ subsets: ['latin'], weight: '400' });

// Inter expuesto como CSS variable (--font-inter) para el design system.
export const interVariable = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});