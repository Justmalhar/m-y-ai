"use client"

import { motion, AnimatePresence } from "framer-motion"

interface TypingIndicatorProps {
  visible: boolean
}

export function TypingIndicator({ visible }: TypingIndicatorProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.2 }}
          className="flex items-center gap-3 px-1"
        >
          <div className="flex items-center gap-1 glass-2 border border-white/10 rounded-2xl rounded-tl-sm px-4 py-3">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-muted-foreground"
                animate={{ y: [0, -4, 0] }}
                transition={{
                  duration: 0.6,
                  repeat: Infinity,
                  delay: i * 0.15,
                  ease: "easeInOut",
                }}
              />
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
