import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Student Support Portal — Technical & Project Support",
  description: "Unified Helpdesk & Mentorship Ticket Submission",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Lato:ital,wght@0,400;0,700;1,400&family=Red+Hat+Mono:wght@500;600&family=Red+Hat+Text:wght@500;600;700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=block"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-light-surface text-light-on-surface font-body antialiased flex flex-col py-10 px-4 sm:px-6">
        {children}
      </body>
    </html>
  );
}
