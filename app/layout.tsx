import type { Metadata } from "next";
import "./globals.css";
import "./workspace-layout.css";

export const metadata: Metadata = {
  title: "Hagadol ERP 1.3.1 | WMK + Hagadol",
  description: "CRM, finance, budgets and cash flow for WMK and Hagadol.",
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
