import type { Metadata } from "next";
import { Inter } from "next/font/google";
import '@fontsource/inter';
import "./globals.css";
import AuthProvider from "@/provider/AuthProvider";
import InfoProvider from "@/provider/InfoProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Create Next App",
  description: "Generated by create next app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {/* <AuthProvider> */}
        <InfoProvider>
          {children}
        </InfoProvider>
        {/* </AuthProvider> */}
      </body>
    </html>
  );
}
