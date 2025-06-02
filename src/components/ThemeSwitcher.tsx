"use client"

import React from "react"
import { Sun, Moon } from "lucide-react"
import { Button } from "./ui/button"

export default function ThemeSwitcher() {
  const [isDark, setIsDark] = React.useState(false)

  const toggleTheme = () => {
    setIsDark(!isDark)
    // In a real app, this would toggle the theme
    document.documentElement.classList.toggle("dark")
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleTheme}
      className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border-white/20 dark:border-slate-700/50"
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  )
}
