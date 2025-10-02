import type { ReactNode } from "react"

type Props = {
  role: "user" | "ai"
  children: ReactNode
}

export default function MessageBubble({ role, children }: Props) {
  const isUser = role === "user"

  return (
    <div className={`flex items-end ${isUser ? "justify-start" : "justify-end"}`}>
      <div className={`flex max-w-[85%] items-end gap-2 sm:max-w-[75%] ${isUser ? "flex-row" : "flex-row-reverse"}`}>
        {/* Avatar */}
        <div
          className="grid h-7 w-7 place-items-center rounded-full border border-border bg-background text-xs"
          aria-hidden="true"
        >
          {isUser ? "👤" : "🤖"}
        </div>

        {/* Bubble */}
        <div
          className={[
            "rounded-2xl px-4 py-2 text-sm",
            isUser
              ? // Primary-based gradient to align with a "blue" feel when --primary is a blue hue.
                // Uses tokens to respect theming; adjust --primary in globals for different hues.
                "bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--primary)/0.85)] text-primary-foreground"
              : // Subtle gray/white bubble using muted tokens
                "bg-muted text-muted-foreground",
          ].join(" ")}
          role="group"
          aria-label={isUser ? "User message" : "AI message"}
        >
          {children}
        </div>
      </div>
    </div>
  )
}
