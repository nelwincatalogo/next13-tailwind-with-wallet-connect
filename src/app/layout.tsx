'use client';

import { WalletProvider } from '@/context/wallet';

import '@/styles/globals.css';
import { Inter } from 'next/font/google';
import { useEffect, useState } from 'react';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.min.css';

const inter = Inter({ subsets: ['latin'] });

declare global {
  interface Window {
    grecaptcha: any;
    dataLayer: any;
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [recaptchaLoaded, setRecaptchaLoaded] = useState(false);

  useEffect(() => {
    if (recaptchaLoaded) return;
    const handleLoaded = (_) => {
      window.grecaptcha.ready();
    };
    const script = document.createElement('script');
    script.src = `https://www.google.com/recaptcha/api.js?render=${process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY}`;
    document.body.appendChild(script);
    script.addEventListener('load', handleLoaded);
    setRecaptchaLoaded(true);
  }, [recaptchaLoaded]);

  return (
    <html lang="en">
      <body className={inter.className}>
        <WalletProvider>{children}</WalletProvider>
        <ToastContainer />
      </body>
    </html>
  );
}
