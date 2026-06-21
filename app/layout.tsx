import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://planar.masn.studio"),
  title: "Planar — Scale, Crop & Tile Images for Printing",
  description: "Scale, crop, and arrange images onto sheets of paper for easy printing. Tile large images across poster grids, calibrate exact real-world dimensions, and remove backgrounds instantly. 100% private, local, and serverless.",
  keywords: [
    "poster tiling",
    "scale images for printing",
    "image dimension calibrator",
    "print layout planner",
    "multi-page printing",
    "tile print posters",
    "image background remover",
    "A4 poster printer",
    "US Letter scaling tool",
    "crop image physical dimensions",
    "local image tiler"
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Planar — Scale, Crop & Tile Images for Printing",
    description: "Scale, crop, and tile large images onto physical paper grids for printing. Calibrate exact real-world dimensions and remove backgrounds locally. 100% private and serverless.",
    url: "https://planar.masn.studio",
    siteName: "Planar",
    images: [
      {
        url: "/favicon-white.png",
        width: 512,
        height: 512,
        alt: "Planar Printable Layout Tool Logo",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Planar — Scale, Crop & Tile Images for Printing",
    description: "Scale, crop, and tile large images onto physical paper grids for printing. Calibrate exact real-world dimensions and remove backgrounds locally. 100% private and serverless.",
    images: ["/favicon-white.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
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
