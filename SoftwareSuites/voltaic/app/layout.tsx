import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'VOLTAIC — Power Grid Workbench',
  description: 'Production power systems: Newton-Raphson load flow, economic dispatch, IEC 60909 short circuit.',
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&family=Orbitron:wght@500;700;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="grid-bg">{children}</body>
    </html>
  );
}
