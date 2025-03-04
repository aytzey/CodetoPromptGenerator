// pages/_app.tsx
import '../styles/globals.css'
import type { AppProps } from 'next/app'
import Head from 'next/head'
import React, { useState } from 'react'

/**
 * Custom App component that wraps all pages. 
 * Manages a global darkMode state for simpler toggling.
 */
export default function MyApp({ Component, pageProps }: AppProps) {
  // Move darkMode state here, shared by entire app
  const [darkMode, setDarkMode] = useState<boolean>(true)

  return (
    <>
      <Head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Roboto+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </Head>

      {/* 
        The outer <div> toggles between "dark" and "light" classes:
        - By default, we’ll use light mode classes
        - If darkMode is true, we apply the "dark" class so that all 
          Tailwind 'dark:' variants take effect
      */}
      <div className={darkMode ? 'dark' : ''}>
        <div className="font-inter min-h-screen bg-white text-gray-900 dark:bg-[#12131C] dark:text-[#E0E2F0] selection:bg-[#7b93fd] selection:text-white">
          {/* 
            Pass darkMode + setDarkMode as props into your pages if needed 
            (we're not actually passing them below, but you can if you like).
          */}
          <Component {...pageProps} />
        </div>
      </div>
    </>
  )
}
