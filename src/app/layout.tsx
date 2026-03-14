import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Social Publisher Automator',
  description: 'Planifiez vos posts YouTube, TikTok, et Instagram',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
