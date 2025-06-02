"use client"
import { Globe } from "lucide-react"
import { Button } from "./ui/button"

export default function LanguageSwitcher() {
  return (
    <Button
      variant="outline"
      size="sm"
      className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border-white/20 dark:border-slate-700/50"
    >
      <Globe className="h-4 w-4 mr-2" />
      EN
    </Button>
  )
}
