"use client"

import { CheckCircle, AlertCircle, AlertTriangle, Info, X } from "lucide-react"
import { Button } from "./ui/button"

// Mock notification types and context for demonstration
type NotificationType = "success" | "error" | "warning" | "info"

interface Notification {
  id: string
  message: string
  type: NotificationType
  timestamp: number
}

// Mock notifications for demonstration
const mockNotifications: Notification[] = []

export default function Notifications() {
  const notifications = mockNotifications

  const removeNotification = (id: string) => {
    // In a real app, this would remove the notification from context
    console.log(`Removing notification: ${id}`)
  }

  // Get icon based on notification type
  const getIcon = (type: NotificationType) => {
    switch (type) {
      case "success":
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case "error":
        return <AlertCircle className="h-5 w-5 text-red-500" />
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />
      case "info":
      default:
        return <Info className="h-5 w-5 text-blue-500" />
    }
  }

  // Get styling based on notification type
  const getNotificationStyles = (type: NotificationType) => {
    switch (type) {
      case "success":
        return {
          bg: "bg-green-50/90 dark:bg-green-900/30",
          border: "border-green-200 dark:border-green-700",
          text: "text-green-800 dark:text-green-200",
        }
      case "error":
        return {
          bg: "bg-red-50/90 dark:bg-red-900/30",
          border: "border-red-200 dark:border-red-700",
          text: "text-red-800 dark:text-red-200",
        }
      case "warning":
        return {
          bg: "bg-yellow-50/90 dark:bg-yellow-900/30",
          border: "border-yellow-200 dark:border-yellow-700",
          text: "text-yellow-800 dark:text-yellow-200",
        }
      case "info":
      default:
        return {
          bg: "bg-blue-50/90 dark:bg-blue-900/30",
          border: "border-blue-200 dark:border-blue-700",
          text: "text-blue-800 dark:text-blue-200",
        }
    }
  }

  if (notifications.length === 0) {
    return null
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-3 max-w-md w-full pointer-events-none">
      {notifications.map((notification) => {
        const styles = getNotificationStyles(notification.type)

        return (
          <div
            key={notification.id}
            className={`
              flex items-start p-4 rounded-lg shadow-xl border backdrop-blur-xl
              ${styles.bg} ${styles.border} ${styles.text}
              transform transition-all duration-500 ease-out
              animate-in slide-in-from-right-full
              pointer-events-auto
            `}
            role="alert"
          >
            {/* Icon */}
            <div className="flex-shrink-0 mr-3 mt-0.5">{getIcon(notification.type)}</div>

            {/* Message */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium leading-relaxed">{notification.message}</p>
            </div>

            {/* Close Button */}
            <Button
              variant="ghost"
              size="sm"
              className="ml-2 h-6 w-6 p-0 hover:bg-white/20 dark:hover:bg-slate-800/20"
              onClick={() => removeNotification(notification.id)}
              aria-label="Close notification"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )
      })}
    </div>
  )
}
