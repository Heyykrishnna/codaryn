import React from "react";
import { ThemeProvider } from "../src/context/ThemeContext";
import { Navbar } from "../src/components/Navbar";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ThemeProvider>
          <Navbar showToggle={true} />
          <main>{children}</main>
        </ThemeProvider>
      </body>
    </html>
  );
}
