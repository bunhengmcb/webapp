import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MCB Inventory Control",
  description: "Shared construction inventory, BOM, transfer, equipment and audit control by site.",
  openGraph: { title: "MCB Inventory Control", description: "Shared construction stock and equipment control by site", images: ["/og.png"] },
  twitter: { card: "summary_large_image", title: "MCB Inventory Control", description: "Shared construction stock and equipment control by site", images: ["/og.png"] },
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
