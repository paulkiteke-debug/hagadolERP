import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hagadol ERP 1.3.0 | WMK + Hagadol",
  description: "Sales, customers, accounts and marketing for WMK and Hagadol.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
