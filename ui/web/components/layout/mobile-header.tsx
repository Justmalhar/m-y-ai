"use client"

import { useState } from "react"
import { MenuIcon, BotIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sidebar } from "./sidebar"
import { motion, AnimatePresence } from "framer-motion"

export function MobileHeader() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-white/8 bg-background/80 backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-primary/20 border border-primary/30 flex items-center justify-center">
            <BotIcon className="w-3 h-3 text-primary" />
          </div>
          <span className="font-semibold text-sm">
            {process.env.NEXT_PUBLIC_APP_NAME ?? "m-y.ai"}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="w-8 h-8"
          onClick={() => setOpen(true)}
        >
          <MenuIcon className="w-4 h-4" />
        </Button>
      </div>

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/60 md:hidden"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 z-50 w-72 md:hidden"
            >
              <Sidebar className="h-full" />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
