import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { DM_Sans, Outfit } from "next/font/google";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AppToaster } from "@/components/AppToaster";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
};

export const metadata: Metadata = {
  title: "Crew Dispatch",
  description:
    "Dispatch management for crews—assign jobs, track responses, and manage schedules.",
  keywords: [
    "electrical subcontractor",
    "crew dispatch",
    "job scheduling",
    "Crew Dispatch",
  ],
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Crew Dispatch",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icon-192.png", sizes: "192x192", type: "image/png" }],
  },
  openGraph: {
    title: "Crew Dispatch",
    description:
      "Assign crews, track job responses, and manage electrical subcontracting work.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${dmSans.variable} ${outfit.variable} font-sans antialiased`}>
        <Script id="crew-dispatch-theme-init" strategy="beforeInteractive">
          {`(function(){try{var d=document.documentElement;var t=localStorage.getItem('crew-dispatch-theme');if(t==='light'){d.classList.remove('dark')}else if(t==='dark'){d.classList.add('dark')}else if(window.matchMedia('(prefers-color-scheme: dark)').matches){d.classList.add('dark')}else{d.classList.remove('dark')}}catch(e){}})();`}
        </Script>
        <ThemeProvider>
          {children}
          <AppToaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
