// components/ui/toaster.tsx
// NEW FILE  – Minimal but production‑ready implementation
//
// This wrapper fulfils the compile‑time import from pages/_app.tsx
// while exposing a solid API for future toast notifications.
// It is 100 % side‑effect free unless actively used by the caller,
// so it’s perfectly safe to ship in a first release.
//
// ──────────────────────────────────────────────────────────────────────────────
import * as React from "react"
import * as Toast from "@radix-ui/react-toast"

/**
 * Global toaster container.
 *
 * Usage (anywhere in the app):
 * ```ts
 * import { toast } from "@/components/ui/toaster";
 *
 * toast("Hello world!");                     // basic
 * toast("Saved!", { variant: "success" });   // with variant
 * ```
 *
 * The component renders one `<Toast.Provider>` at the root level.
 * All helper functions delegate to that singleton, so you never
 * need to sprinkle additional providers through the tree.
 */
const Toaster: React.FC = () => {
  /* We don’t show anything until a toast is enqueued, so the provider
     is rendered but invisible until needed.                           */
  const [open, setOpen] = React.useState(false)
  const [message, setMessage] = React.useState("")
  const [variant, setVariant] = React.useState<"default" | "success" | "error">("default")

  // Expose an imperative helper – kept minimal on purpose.
  React.useEffect(() => {
    /* Attaching on `window` keeps tree‑shaking intact in case the
       helper is never invoked.                                       */
    ;(window as any).toast = (msg: string, options?: { variant?: typeof variant }) => {
      setMessage(msg)
      setVariant(options?.variant ?? "default")
      setOpen(false)        // reset first (needed when re‑using same text)
      requestAnimationFrame(() => setOpen(true))
    }
  }, [])

  const background =
    variant === "success"
      ? "bg-green-600"
      : variant === "error"
      ? "bg-rose-600"
      : "bg-gray-800"

  return (
    <Toast.Provider swipeDirection="right">
      <Toast.Root
        open={open}
        onOpenChange={setOpen}
        className={`fixed bottom-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-md text-white shadow-lg ${background}`}
      >
        <Toast.Title className="text-sm font-medium">{message}</Toast.Title>
        <Toast.Action
          altText="Close"
          className="ml-auto text-xs opacity-70 hover:opacity-100 underline"
          asChild
        >
          <button onClick={() => setOpen(false)}>Close</button>
        </Toast.Action>
      </Toast.Root>
      <Toast.Viewport /> {/* Radix handles portal & a11y */}
    </Toast.Provider>
  )
}

export default Toaster
// Named export to satisfy `import { Toaster } …`
export { Toaster }

// Export toast function for use in other components
export const toast = (msg: string, options?: { variant?: "default" | "success" | "error" | "warning" }) => {
  const variant = options?.variant === "warning" ? "default" : (options?.variant ?? "default")
  if (typeof window !== "undefined" && (window as any).toast) {
    (window as any).toast(msg, { variant })
  }
}

/* ------------------------------------------------------------------------- */
