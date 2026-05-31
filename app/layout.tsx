import '@/app/ui/global.css';
import { interVariable } from '@/app/ui/fonts';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={interVariable.variable}>
      <body>{children}</body>
    </html>
  );
}
