"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function NewChatPage() {
  const router = useRouter()

  useEffect(() => {
    const id = crypto.randomUUID()
    router.replace(`/chat/${id}`)
  }, [router])

  return null
}
