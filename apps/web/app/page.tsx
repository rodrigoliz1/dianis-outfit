"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function Home() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleStart = () => {
    router.push("/assistant");
  };

  if (!mounted) return null;

  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center bg-background px-4 text-center">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="mb-12"
      >
        <h1 className="font-serif text-5xl font-light text-charcoal sm:text-6xl tracking-wide">
          Dianis Outfit
        </h1>
        <p className="mt-4 text-lg font-light text-soft-gray sm:text-xl tracking-wider">
          Dianis tiene al mejor novio del mundo.
        </p>
      </motion.div>

      <motion.button
        onClick={handleStart}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        transition={{
          duration: 0.5,
          delay: 0.4,
          ease: "easeOut"
        }}
        className="relative group flex h-32 w-32 items-center justify-center rounded-full bg-ivory shadow-[0_0_40px_-10px_rgba(199,163,90,0.5)] border border-soft-gold/30"
      >
        <div className="absolute inset-0 rounded-full border-2 border-soft-gold opacity-50 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700 ease-out" />
        <div className="absolute inset-0 rounded-full animate-ping opacity-20 bg-soft-gold" style={{ animationDuration: '3s' }} />
        <span className="font-serif text-xl font-medium text-deep-gold z-10">
          Empezar
        </span>
      </motion.button>
    </main>
  );
}
