"use client"

import type React from "react"
import { useEffect, useRef, useState, useCallback } from "react"
import MessageBubble from "./message-bubble"
import LoadingDots from "./loading-dots"

type Role = "user" | "ai"
type Message = {
  id: string
  role: Role
  content: string
}

type ActionItem = { id: string; text: string; done: boolean }

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "ai",
      content: "Hi! I’m your AI assistant. Send a message or attach a file to get started.",
    },
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [isDark, setIsDark] = useState(false)
  const [actionItems, setActionItems] = useState<ActionItem[]>([
    { id: "a1", text: "Prepare demo outline", done: false },
    { id: "a2", text: "Review uploaded docs", done: false },
    { id: "a3", text: "Assign next steps", done: false },
  ])
  const endRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isLoading])

  useEffect(() => {
    if (typeof window === "undefined") return
    const stored = localStorage.getItem("theme")
    const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches
    const next = stored ? stored === "dark" : !!prefersDark
    setIsDark(next)
    document.documentElement.classList.toggle("dark", next)
  }, [])

  const handleFiles = useCallback((incoming: FileList | File[]) => {
    const next = Array.from(incoming)
    if (next.length === 0) return
    setFiles(next)
  }, [])

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files) return
    handleFiles(e.target.files)
  }

  function onDragOver(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(true)
  }

  function onDragLeave(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files)
      e.dataTransfer.clearData()
    }
  }

  function onClearFiles() {
    setFiles([])
  }

  function toggleDark() {
    setIsDark((prev) => {
      const next = !prev
      document.documentElement.classList.toggle("dark", next)
      localStorage.setItem("theme", next ? "dark" : "light")
      return next
    })
  }

  function toggleItem(id: string) {
    setActionItems((prev) => prev.map((it) => (it.id === id ? { ...it, done: !it.done } : it)))
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = input.trim()
    if (!trimmed) return

    const newUserMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
    }
    setMessages((prev) => [...prev, newUserMessage])
    setInput("")
    setIsLoading(true)

    // Simulate AI response
    setTimeout(() => {
      const aiReply: Message = {
        id: crypto.randomUUID(),
        role: "ai",
        content:
          files.length > 0
            ? `You said: "${trimmed}". I also see ${files.length} file${files.length > 1 ? "s" : ""} attached.`
            : `You said: "${trimmed}".`,
      }
      setMessages((prev) => [...prev, aiReply])
      setIsLoading(false)
    }, 1000)
  }

  return (
    <div className="px-0 md:px-0">
      <div
        className="mx-auto flex h-[70dvh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-md md:h-[75dvh]"
        role="region"
        aria-label="Chat window"
      >
        {/* Header with dark mode toggle */}
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-medium text-muted-foreground">Chat</h2>
          <button
            type="button"
            onClick={toggleDark}
            aria-pressed={isDark}
            aria-label="Toggle dark mode"
            className="rounded-md border border-input bg-background px-2.5 py-1.5 text-xs text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {isDark ? "Light mode" : "Dark mode"}
          </button>
        </header>

        {/* Body: grid with main chat and sidebar */}
        <div className="grid flex-1 grid-cols-1 gap-3 p-3 md:grid-cols-[1fr_280px]">
          {/* Main column */}
          <div className="flex min-h-0 flex-col">
            {/* File upload area - drag and drop + browse (kept at top) */}
            <div
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              className={[
                "rounded-lg border border-dashed p-3 transition-colors",
                isDragging ? "border-primary bg-muted/60" : "border-muted-foreground/30 bg-muted/30",
              ].join(" ")}
              aria-label="File upload area"
            >
              <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
                <div className="text-center sm:text-left">
                  <p className="text-sm font-medium">Attach files</p>
                  <p className="text-xs text-muted-foreground">Drag and drop files here, or browse to upload.</p>
                </div>
                <div className="flex items-center gap-2">
                  <label
                    htmlFor="file-upload"
                    className="cursor-pointer rounded-md bg-secondary px-3 py-2 text-xs font-medium text-secondary-foreground hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    Browse files
                    <input id="file-upload" type="file" multiple onChange={onFileChange} className="sr-only" />
                  </label>
                  {files.length > 0 && (
                    <>
                      <div className="truncate rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
                        {files.length === 1 ? files[0].name : `${files.length} files selected`}
                      </div>
                      <button
                        type="button"
                        onClick={onClearFiles}
                        className="rounded-md bg-accent px-2 py-1 text-xs text-accent-foreground hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        aria-label="Clear selected files"
                      >
                        Clear
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Messages */}
            <section
              className="mt-3 flex-1 overflow-y-auto px-2 py-2"
              aria-live="polite"
              aria-relevant="additions"
              aria-label="Message history"
            >
              <div className="mx-auto flex max-w-2xl flex-col gap-3">
                {messages.map((m) => (
                  <MessageBubble key={m.id} role={m.role}>
                    {m.content}
                  </MessageBubble>
                ))}
                {isLoading && (
                  <MessageBubble role="ai">
                    <LoadingDots />
                  </MessageBubble>
                )}
                <div ref={endRef} />
              </div>
            </section>

            {/* Bottom input */}
            <form
              onSubmit={onSubmit}
              className="mt-3 border-t border-border bg-card/80 px-2 py-3"
              aria-label="Message input form"
            >
              <div className="mx-auto grid max-w-2xl grid-cols-[1fr_auto] gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type your message…"
                  aria-label="Message input"
                  className="min-w-0 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <button
                  type="submit"
                  disabled={isLoading}
                  className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
                  aria-label="Send message"
                >
                  Send
                </button>
              </div>
            </form>
          </div>

          {/* Sidebar */}
          <aside className="min-h-0 overflow-hidden rounded-lg border border-border bg-background">
            <div className="grid h-full grid-rows-[auto_1fr_auto_1fr]">
              {/* Uploaded Docs header */}
              <div className="flex items-center justify-between border-b border-border px-3 py-2">
                <h3 className="text-xs font-semibold text-muted-foreground">Uploaded Documents</h3>
                <span className="text-[10px] text-muted-foreground">{files.length}</span>
              </div>
              {/* Uploaded Docs list */}
              <div className="min-h-0 overflow-y-auto px-3 py-2">
                {files.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No files yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {files.map((f, idx) => (
                      <li
                        key={f.name + idx}
                        className="rounded-md border border-border/70 bg-card/50 px-2 py-1.5 text-xs"
                        title={f.name}
                      >
                        <div className="truncate text-foreground">{f.name}</div>
                        <div className="text-[10px] text-muted-foreground">{(f.size / 1024).toFixed(1)} KB</div>
                      </li>
                    ))}
                  </ul>
                )}
                {files.length > 0 && (
                  <div className="mt-2">
                    <button
                      type="button"
                      onClick={onClearFiles}
                      className="w-full rounded-md bg-accent px-2 py-1 text-xs font-medium text-accent-foreground hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      Clear all
                    </button>
                  </div>
                )}
              </div>

              {/* Action Items header */}
              <div className="border-t border-border px-3 py-2">
                <h3 className="text-xs font-semibold text-muted-foreground">Team Action Items</h3>
              </div>
              {/* Action Items list */}
              <div className="min-h-0 overflow-y-auto px-3 pb-3">
                <ul className="space-y-2">
                  {actionItems.map((item) => (
                    <li key={item.id} className="flex items-center gap-2">
                      <input
                        id={`item-${item.id}`}
                        type="checkbox"
                        className="h-3.5 w-3.5 accent-[hsl(var(--primary))]"
                        checked={item.done}
                        onChange={() => toggleItem(item.id)}
                      />
                      <label
                        htmlFor={`item-${item.id}`}
                        className={`text-xs ${item.done ? "text-muted-foreground line-through" : "text-foreground"}`}
                      >
                        {item.text}
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
