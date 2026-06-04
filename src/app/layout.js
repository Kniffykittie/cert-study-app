import "./globals.css";
import Sidebar from "./Sidebar";

export const metadata = {
  title: "CSA",
  description: "CCNA, Network+, and Security+ Study Platform",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex" style={{backgroundColor: 'var(--background)', color: 'var(--text-primary)'}}>
        <Sidebar />
        <main style={{flex: 1, padding: '24px', overflowY: 'auto'}}>
          {children}
        </main>
      </body>
    </html>
  );
}