import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Planar | Minimalist Scale Layout & Positioning Tool",
  description: "A professional, minimalist, serverless utility for calibrating, scaling, arranging, and distributing images onto standard paper sizes.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, height: "100%", overflow: "hidden" }}>
        {children}
      </body>
    </html>
  );
}
