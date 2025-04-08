// File: pages/_app.tsx
// REFACTOR / OVERWRITE
import '../styles/globals.css'
import type { AppProps } from 'next/app'
import Head from 'next/head'
import React, { useEffect } from 'react'
import { useAppStore } from '@/stores/useAppStore' // Import zustand store
import { Toaster } from "@/components/ui/toaster" // Assuming you add a toaster component
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert" // For global error display
import { AlertCircle, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * Custom App component that wraps all pages.
 * Uses Zustand store for global state like dark mode and errors.
 */
export default function MyApp({ Component, pageProps }: AppProps) {
  // Get dark mode state and error state from Zustand store
  const darkMode = useAppStore((state) => state.darkMode);
  const error = useAppStore((state) => state.error);
  const clearError = useAppStore((state) => state.clearError);

  // Apply dark mode class to HTML element for Tailwind
  useEffect(() => {
    const htmlElement = document.documentElement;
    if (darkMode) {
      htmlElement.classList.add('dark');
    } else {
      htmlElement.classList.remove('dark');
    }
    // Optional: Persist dark mode preference
    // localStorage.setItem('darkMode', JSON.stringify(darkMode));
  }, [darkMode]);

  // Optional: Load dark mode preference on initial load
  // useEffect(() => {
  //   const storedDarkMode = localStorage.getItem('darkMode');
  //   if (storedDarkMode !== null) {
  //     useAppStore.setState({ darkMode: JSON.parse(storedDarkMode) });
  //   } else {
  //      // Fallback to system preference
  //      useAppStore.setState({ darkMode: window.matchMedia('(prefers-color-scheme: dark)').matches });
  //   }
  // }, []);


  return (
    <>
      <Head>
         <title>Code to Prompt Generator</title> {/* Default Title */}
         <meta name="description" content="Generate LLM prompts from your code" />
         <link rel="icon" href="/favicon.ico" />
        {/* Keep font links */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Roboto+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </Head>

      {/* Outer div for background color and text color based on theme */}
      <div className="font-inter min-h-screen bg-gray-50 text-gray-900 dark:bg-gradient-to-br dark:from-gray-900 dark:to-gray-950 dark:text-[#E0E2F0] selection:bg-indigo-300 selection:text-indigo-900 dark:selection:bg-[#7b93fd] dark:selection:text-white transition-colors duration-200">

        {/* Global Error Display */}
        {error && (
            <div className="fixed top-4 right-4 z-50 max-w-md w-full animate-fadeIn">
                <Alert variant="destructive" className="shadow-lg">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>
                       {error}
                    </AlertDescription>
                     <Button
                        variant="ghost"
                        size="sm"
                        className="absolute top-1 right-1 h-6 w-6 p-0 text-red-800 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/50"
                        onClick={clearError}
                        aria-label="Dismiss error"
                      >
                        <X size={16} />
                      </Button>
                </Alert>
            </div>
        )}

        {/* Render the current page */}
        <Component {...pageProps} />

        {/* Optional: Add a Toaster component for non-critical notifications */}
        {/* <Toaster /> */}
      </div>
    </>
  )
}

