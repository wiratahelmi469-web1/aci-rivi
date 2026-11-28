'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import Image from 'next/image';

interface SplashScreenProps {
  visible: boolean;
  subtitle?: string;
}

export function SplashScreen({
  visible,
  subtitle = 'Menyiapkan seblakmu...',
}: SplashScreenProps) {
  const prefersReduced = useReducedMotion();

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="aci-rivi-splash"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: prefersReduced ? 0 : 0.35, ease: 'easeOut' }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-gradient-to-b from-[#FFF2ED] via-[#FFE4DA] to-[#FFD5C6] px-6 text-center select-none"
          aria-live="polite"
          aria-label="Memuat Aci Rivi"
        >
          <div className="relative flex flex-col items-center">
            {/* Garis uap halus di atas mangkuk seblak */}
            <div className="mb-1 flex h-6 items-end justify-center gap-2" aria-hidden="true">
              {[0, 0.25, 0.5].map((delay, idx) =>
                prefersReduced ? (
                  <span
                    key={idx}
                    className="h-3.5 w-1 rounded-full bg-orange-400/50"
                  />
                ) : (
                  <motion.span
                    key={idx}
                    initial={{ opacity: 0.2, y: 4 }}
                    animate={{
                      opacity: [0.25, 0.8, 0.25],
                      y: [4, -5, 4],
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      delay,
                      ease: 'easeInOut',
                    }}
                    className="h-4 w-1 rounded-full bg-orange-500/60"
                  />
                )
              )}
            </div>

            {prefersReduced ? (
              <div className="relative h-20 w-20 overflow-hidden rounded-3xl bg-white/80 shadow-xs">
                <Image
                  src="/icons/icon-192.png"
                  alt="Logo Aci Rivi"
                  fill
                  priority
                  sizes="80px"
                  className="object-cover"
                />
              </div>
            ) : (
              <motion.div
                animate={{ scale: [1, 1.06, 1] }}
                transition={{
                  duration: 1.6,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className="relative h-20 w-20 overflow-hidden rounded-3xl bg-white/85 shadow-sm"
              >
                <Image
                  src="/icons/icon-192.png"
                  alt="Logo Aci Rivi"
                  fill
                  priority
                  sizes="80px"
                  className="object-cover"
                />
              </motion.div>
            )}

            <h1 className="mt-5 text-4xl font-bold tracking-tight text-red-600 sm:text-5xl">
              Aci Rivi
            </h1>
            <p className="mt-2 text-sm font-medium text-orange-900/80">
              {subtitle}
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
