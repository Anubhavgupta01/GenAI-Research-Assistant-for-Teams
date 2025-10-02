export default function LoadingDots() {
  return (
    <div className="flex items-center gap-1">
      <span
        className="inline-block h-1.5 w-1.5 rounded-full bg-foreground/60 opacity-90 animate-bounce"
        style={{ animationDelay: "0ms" }}
      />
      <span
        className="inline-block h-1.5 w-1.5 rounded-full bg-foreground/60 opacity-90 animate-bounce"
        style={{ animationDelay: "150ms" }}
      />
      <span
        className="inline-block h-1.5 w-1.5 rounded-full bg-foreground/60 opacity-90 animate-bounce"
        style={{ animationDelay: "300ms" }}
      />
    </div>
  )
}
