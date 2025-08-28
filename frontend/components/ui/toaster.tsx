// @ts-nocheck
"use client"
import {
  Toast as UiToast,
  ToastClose as UiToastClose,
  ToastDescription as UiToastDescription,
  ToastProvider as UiToastProvider,
  ToastTitle as UiToastTitle,
  ToastViewport as UiToastViewport,
} from "@/components/ui/toast"
import { useToast } from "@/hooks/use-toast"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <UiToastProvider>
      {toasts.map(({ id, title, description, action, open, onOpenChange, duration, variant }) => (
        <UiToast key={id} open={open} onOpenChange={onOpenChange} duration={duration} variant={variant as any}>
          <div className="grid gap-1">
            {title && <UiToastTitle>{title}</UiToastTitle>}
            {description && <UiToastDescription>{description}</UiToastDescription>}
          </div>
          {action}
          <UiToastClose />
        </UiToast>
      ))}
      <UiToastViewport />
    </UiToastProvider>
  )
}
