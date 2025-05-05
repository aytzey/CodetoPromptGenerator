// pages/_app.tsx
import "../styles/globals.css";
import type { AppProps } from "next/app";
import Head from "next/head";
import { useEffect } from "react";
import ErrorBoundary from "@/components/ErrorBoundary";
import { Toaster } from "@/components/ui/toaster";

export default function MyApp({ Component, pageProps }: AppProps) {
  // Apply dark theme and additional visual enhancements on client mount
  useEffect(() => {
    // Apply dark theme
    document.documentElement.classList.add('dark');
    document.documentElement.classList.remove('light');
    
    // Set color scheme for browser UI consistency
    document.documentElement.style.colorScheme = 'dark';
    
    // Add subtle background grid pattern
    const gridOverlay = document.createElement('div');
    gridOverlay.className = 'fixed inset-0 pointer-events-none z-[-2] opacity-[0.03]';
    gridOverlay.style.backgroundImage = 'linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px)';
    gridOverlay.style.backgroundSize = '40px 40px';
    document.body.appendChild(gridOverlay);
    
    // Add subtle noise texture
    const noiseOverlay = document.createElement('div');
    noiseOverlay.className = 'fixed inset-0 pointer-events-none z-[-1] opacity-[0.015]';
    noiseOverlay.style.backgroundImage = 'url("/noise-texture.svg")';
    document.body.appendChild(noiseOverlay);
    
    // Clean up on unmount
    return () => {
      document.body.removeChild(gridOverlay);
      document.body.removeChild(noiseOverlay);
    };
  }, []);

  return (
    <>
      <Head>
        <title>Code → Prompt Generator</title>
        <meta name="description" content="Generate finely‑tuned LLM prompts straight from your code base." />
        <link rel="icon" href="/favicon.ico" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <meta name="theme-color" content="#0d0e21" />
        <meta property="og:title" content="Code to Prompt Generator" />
        <meta property="og:description" content="Transform your codebase into finely-tuned prompts for LLMs" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
      </Head>

      {/* Global error boundary with improved styling */}
      <ErrorBoundary>
        <div className="min-h-screen bg-[rgb(var(--color-bg-primary))] text-[rgb(var(--color-text-primary))]">
          <Component {...pageProps} />
        </div>
        
        {/* Global toast notifications with enhanced styling */}
        <Toaster />
      </ErrorBoundary>
    </>
  );
}