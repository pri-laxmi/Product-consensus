
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Product Consensus AI",
  description:
    "Research products using customer reviews and online discussions.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
