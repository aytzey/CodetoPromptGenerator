// pages/_app.tsx
import "../styles/globals.css";
import type { AppProps } from "next/app";
import Head from "next/head";
import { useEffect } from "react";

import { useAppStore } from "@/stores/useAppStore";
import ErrorBoundary from "@/components/ErrorBoundary";

export default function MyApp({ Component, pageProps }: AppProps) {
  const darkMode = useAppStore((s) => s.darkMode);

  /* dark‑mode class toggle */
  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  return (
    <>
      <Head>
        <title>Code → Prompt Generator</title>
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
