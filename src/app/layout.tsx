import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-serif",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Docs LV — Secure Document Storage",
  description:
    "A secure SaaS document vault. Authenticate, pay once, connect your own Supabase backend, and manage files with confidence.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <ClerkProvider
          appearance={{
            variables: {
              colorPrimary: "#C86A46",
            },
          }}
        >
          {children}
          <Toaster richColors position="top-right" />
        </ClerkProvider>
      </body>
    </html>
  );
}
