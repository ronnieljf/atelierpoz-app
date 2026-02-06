'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';

export function InitialLoader() {
  const [isLoading, setIsLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
      setTimeout(() => {
        setIsVisible(false);
      }, 500);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-neutral-950"
        >
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
            className="flex flex-col items-center"
          >
            <motion.div
              className="relative w-60 sm:w-72 md:w-80 h-auto overflow-hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.9, delay: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
            >
              {/* Resplandor muy sutil */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-br from-primary-500/8 via-primary-400/3 to-transparent pointer-events-none"
                initial={{ opacity: 0 }}
                animate={{
                  opacity: [0, 0.28, 0.06],
                }}
                transition={{
                  duration: 0.7,
                  delay: 0.55,
                  times: [0, 0.4, 1],
                  ease: [0.25, 0.1, 0.25, 1],
                }}
              />
              <div className="relative">
                <Image
                  src="/logo-atelier.png"
                  alt="Atelier"
                  width={1000}
                  height={1000}
                  className="relative z-10 w-full h-auto object-contain"
                  priority
                />
                {/* Barrido diagonal sutil y elegante */}
                <div
                  className="absolute inset-0 z-20 pointer-events-none flex items-stretch -rotate-45 overflow-visible"
                  aria-hidden
                >
                  <motion.div
                    className="w-[45%] min-w-[45%] flex-shrink-0 bg-gradient-to-r from-transparent via-white/25 to-transparent"
                    initial={{ x: '-100%' }}
                    animate={{ x: '250%' }}
                    transition={{
                      duration: 0.55,
                      delay: 0.58,
                      ease: [0.25, 0.1, 0.25, 1],
                    }}
                  />
                </div>
              </div>
            </motion.div>
            <motion.div
              className="mt-5 h-0.5 w-28 bg-gradient-to-r from-transparent via-primary-500/80 to-transparent"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.8, delay: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
