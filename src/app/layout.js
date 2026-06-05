import "./globals.css";

export const metadata = {
  title: "CSA",
  description: "CCNA, Network+, and Security+ Study Platform",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full">
      <body style={{ backgroundColor: 'var(--background)', color: 'var(--text-primary)', minHeight: '100vh' }}>
        {children}
      </body>
    </html>
  );
}
