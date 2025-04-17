// File: components/home/Footer.tsx
// -----------------------------------------------------------------------------
// Tiny footer to keep the year always current.
// -----------------------------------------------------------------------------

import React from "react";

export default function Footer() {
  return (
    <footer className="mt-12 border-t pt-6 text-center text-xs text-gray-500 dark:text-gray-400">
      Code to Prompt Generator © {new Date().getFullYear()} Aytzey
    </footer>
  );
}
