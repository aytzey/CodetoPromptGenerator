// pages/_app.tsx
import "../styles/globals.css";
import type { AppProps } from "next/app";
import Head from "next/head";
import { useEffect } from "react";

// Removed useAppStore import as darkMode state is no longer needed here
import ErrorBoundary from "@/components/ErrorBoundary";

export default function MyApp({ Component, pageProps }: AppProps) {
  // Always apply dark theme on client mount
  useEffect(() => {
    document.documentElement.classList.add('dark');
    // Optional: Remove 'light' if it might exist from previous logic or SSR attempts
    // document.documentElement.classList.remove('light');
    // Ensure color scheme preference is set for browser UI consistency
    document.documentElement.style.colorScheme = 'dark';
  }, []);

  return (
    <>
      <Head>
        <title>Code → Prompt Generator</title>
        <meta name="description" content="Generate finely‑tuned LLM prompts straight from your code base." />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* global error boundary */}
      <ErrorBoundary>
        <Component {...pageProps} />
      </ErrorBoundary>
    </>
  );
}