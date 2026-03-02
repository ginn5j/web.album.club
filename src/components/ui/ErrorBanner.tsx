import { AlertCircle } from 'lucide-react'

interface ErrorBannerProps {
  message: string
  className?: string
}

export function ErrorBanner({ message, className = '' }: ErrorBannerProps) {
  return (
    <div className={`flex items-start gap-3 rounded-md bg-red-50 border border-red-200 p-4 text-sm text-red-700 ${className}`}>
      <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
      <p>{message}</p>
    </div>
  )
}
