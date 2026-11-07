"use client";

import { motion } from "framer-motion";
import { Egg } from "lucide-react";

export default function LoadingOverlay() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/60 backdrop-blur-xl"
    >
      <div className="relative flex items-center justify-center">
        {/* Pulsing Glow */}
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="absolute h-32 w-32 rounded-full bg-blue-500/30 blur-2xl"
        />
        
        {/* Subtle Bounce */}
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          className="relative"
        >
          {/* 3D Spinning Egg */}
          <motion.div
            animate={{ rotateY: 360 }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
          >
            <Egg aria-hidden="true" className="h-14 w-14 text-amber-100" strokeWidth={1.5} fill="currentColor" fillOpacity={0.15} />
          </motion.div>
        </motion.div>
      </div>
      
      <motion.p
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="mt-7 text-lg font-medium tracking-wide text-blue-200"
      >
        Syncing with the Coop...
      </motion.p>
    </motion.div>
  );
}
