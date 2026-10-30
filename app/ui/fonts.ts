import { Inter } from 'next/font/google';

// Inter expuesto como CSS variable (--font-inter) para el design system.
export const interVariable = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});