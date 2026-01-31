import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "D&D Solo",
  description: "Venture alone into the world of D&D",
  icons: {
    icon: [
      {
        url: "data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>⚔️</text></svg>",
        type: "image/svg+xml",
      },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full" data-theme="fables">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-full h-full`}
      >
        {children}
        <Toaster
          position="bottom-right"
          theme="dark"
          expand
          toastOptions={{
            unstyled: true,
            classNames: {
              toast:
                "flex items-center gap-3 p-4 rounded-lg shadow-lg border border-primary/20 backdrop-blur-sm bg-base-200/95 text-base-content",
              title: "font-semibold text-sm",
              description: "text-xs text-base-content/60",
            },
          }}
        />
      </body>
    </html>
  );
}
