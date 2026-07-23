import "./globals.css";
import ServiceWorkerRegistrar from '@/components/ServiceWorkerRegistrar'
import TimezoneSync from '@/components/TimezoneSync'

export const metadata = {
  title: "CSA",
  description: "CCNA, Network+, and Security+ Study Platform",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#a78bfa" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="CSA" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body style={{ backgroundColor: 'var(--background)', color: 'var(--text-primary)', minHeight: '100vh' }}>
        <ServiceWorkerRegistrar />
        <TimezoneSync />
        {children}
      </body>
    </html>
  );
}
