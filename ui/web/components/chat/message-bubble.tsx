"use client"

import { motion } from "framer-motion"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeHighlight from "rehype-highlight"
import { cn } from "@/lib/utils"
import type { ChatMessage } from "@/hooks/use-chat"

interface MessageBubbleProps {
  message: ChatMessage
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user"

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}
    >
      <div
        className={cn(
          "max-w-[85%] md:max-w-[75%] px-4 py-3 text-sm leading-relaxed",
          isUser
            ? "glass-3 border border-primary/20 rounded-2xl rounded-tr-sm text-foreground"
            : "glass-2 border-t border-r border-b border-white/8 border-l-2 border-l-primary/40 rounded-2xl rounded-tl-sm text-foreground",
          message.isStreaming && "after:content-['▋'] after:ml-0.5 after:opacity-70 after:animate-pulse"
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        ) : (
          <div className="prose prose-invert prose-sm max-w-none
            prose-p:my-1 prose-headings:mt-3 prose-headings:mb-1
            prose-code:before:content-none prose-code:after:content-none
            prose-code:bg-white/10 prose-code:px-1 prose-code:py-0.5 prose-code:rounded
            prose-pre:bg-transparent prose-pre:p-0
            prose-a:text-primary prose-a:no-underline hover:prose-a:underline">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeHighlight]}
            >
              {message.content || (message.isStreaming ? " " : "")}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </motion.div>
  )
}
