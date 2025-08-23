import { Alert, AlertDescription } from "@/components/ui/alert"
import { TriangleAlert } from "lucide-react"

interface FormErrorProps {
  message?: string | null
  className?: string
}

export function FormError({ message, className }: FormErrorProps) {
  if (!message) return null
  return (
    <Alert variant="destructive" className={className}>
      <TriangleAlert />
      <AlertDescription>
        {message}
      </AlertDescription>
    </Alert>
  )
}
