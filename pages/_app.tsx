import '../styles/globals.css'
import type { AppProps } from 'next/app'
import Head from 'next/head'

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        {/* Import a nice, professional looking font */}
        <link rel="preconnect" href="https://fonts.googleapis.com"/>
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin=''/>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet"/>
      </Head>
      <div className="font-inter min-h-screen bg-[#1e1f29] text-[#e0e2f0]">
        <Component {...pageProps} />
      </div>
    </>
  )
}
