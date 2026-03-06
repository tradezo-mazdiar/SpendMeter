"use client"

import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"

const DEFAULT_TOAST_DURATION_MS = 3_000
const DESTRUCTIVE_TOAST_DURATION_MS = 15_000

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider duration={DEFAULT_TOAST_DURATION_MS}>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        const duration =
          props.duration ??
          (props.variant === "destructive"
            ? DESTRUCTIVE_TOAST_DURATION_MS
            : DEFAULT_TOAST_DURATION_MS)
        return (
          <Toast key={id} {...props} duration={duration}>
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
