import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export function ThemeToggle() {
  const [theme, setTheme] = React.useState<'light' | 'dark'>('dark')

  React.useEffect(() => {
    // Check for saved theme preference or default to dark
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' || 'dark'
    setTheme(savedTheme)
    applyTheme(savedTheme)
  }, [])

  const applyTheme = (newTheme: 'light' | 'dark') => {
    const root = document.documentElement
    root.classList.remove('light', 'dark')
    root.classList.add(newTheme)
    root.style.colorScheme = newTheme
  }

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(newTheme)
    localStorage.setItem('theme', newTheme)
    applyTheme(newTheme)
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="rounded-full h-9 w-9 text-[rgb(var(--color-text-secondary))] hover:bg-[rgba(var(--color-primary),0.15)] hover:text-[rgb(var(--color-primary))] transition-all duration-300 relative group"
          >
            {theme === 'dark' ? (
              <Sun size={20} className="transition-transform duration-500 group-hover:rotate-45" />
            ) : (
              <Moon size={20} className="transition-transform duration-500 group-hover:-rotate-12" />
            )}
            {/* Subtle ring on hover */}
            <span className="absolute inset-0 rounded-full border border-[rgba(var(--color-primary),0.3)] opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100 transition-all"></span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="glass py-2 px-3 shadow-lg border-[rgba(var(--color-border),0.2)]">
          <p className="text-[rgb(var(--color-text-secondary))] text-xs">
            Switch to {theme === 'dark' ? 'light' : 'dark'} theme
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}