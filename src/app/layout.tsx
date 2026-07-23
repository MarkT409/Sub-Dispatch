import type { Metadata } from "next";
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

export const metadata: Metadata = {
  title: "Lantana Electric LLC | Residential & Commercial Electrical",
  description:
    "Lantana Electric provides residential, commercial, and underground electrical services—rough-in, trim, builder power, and subcontractor crews across Central Texas.",
  keywords: [
    "electrical subcontractor",
    "rough-in electrical",
    "trim electrical",
    "electrical contractor",
    "Lantana",
  ],
  openGraph: {
    title: "Lantana | Electrical Subcontractor",
    description:
      "Skilled crews for rough-in and trim installation. Partner with Lantana for reliable electrical subcontracting.",
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
        <Script id="lantana-theme-init" strategy="beforeInteractive">
          {`(function(){try{var d=document.documentElement;var t=localStorage.getItem('lantana-theme');if(t==='light'){d.classList.remove('dark')}else if(t==='dark'){d.classList.add('dark')}else if(window.matchMedia('(prefers-color-scheme: dark)').matches){d.classList.add('dark')}else{d.classList.remove('dark')}}catch(e){}})();`}
        </Script>
        <ThemeProvider>
          {children}
          <AppToaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
