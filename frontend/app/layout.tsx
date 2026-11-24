import "./globals.css";
import type { Metadata } from "next";
import Nav from "@/components/Nav";

export const metadata: Metadata = {
  title: "FarmPool AI - ग्रामीण मंडी और किसान समूह",
  description: "गांव के किसानों और खरीदारों का समूह मंच। बिना इंटरनेट भी काम करता है।",
  manifest: "/manifest.json",
  themeColor: "#1b6928",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="hi">
      <head>
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icon.svg" />
      </head>
      <body className="min-h-screen bg-[#faf6ef] text-[#3b2819] antialiased selection:bg-green-200">
        <Nav />
        <main className="mx-auto max-w-6xl px-3 sm:px-4 py-6 sm:py-8">{children}</main>

        {/* PWA Service Worker Registration Script */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(
                    function(reg) {
                      console.log('FarmPool Offline ServiceWorker ready:', reg.scope);
                    },
                    function(err) {
                      console.log('ServiceWorker registration failed:', err);
                    }
                  );
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
