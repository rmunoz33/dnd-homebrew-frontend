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
    <html lang="en" className="h-full">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-full h-full`}
      >
        {children}
        <Toaster
          position="bottom-right"
          theme="dark"
          toastOptions={{
            unstyled: true,
            classNames: {
              toast:
                "flex items-center gap-3 p-4 rounded-lg shadow-lg border backdrop-blur-sm",
              title: "font-semibold text-sm",
              description: "text-xs opacity-80",
              success:
                "bg-emerald-900/90 border-emerald-700 text-emerald-100",
              error: "bg-red-900/90 border-red-700 text-red-100",
              warning: "bg-amber-900/90 border-amber-700 text-amber-100",
              info: "bg-blue-900/90 border-blue-700 text-blue-100",
            },
          }}
          icons={{
            success: <span className="text-lg">✨</span>,
            error: <span className="text-lg">💔</span>,
            warning: <span className="text-lg">⚠️</span>,
            info: <span className="text-lg">📜</span>,
          }}
        />
      </body>
    </html>
  );
}
