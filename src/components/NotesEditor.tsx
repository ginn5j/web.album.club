import { CheckCircle } from 'lucide-react'
import { Spinner } from './ui/Spinner'

interface NotesEditorProps {
  value: string
  onChange: (value: string) => void
  saving?: boolean
  saved?: boolean
  disabled?: boolean
  placeholder?: string
}

export function NotesEditor({
  value,
  onChange,
  saving,
  saved,
  disabled,
  placeholder = 'Your thoughts on this album...',
}: NotesEditorProps) {
  return (
    <div className="relative">
      <textarea
        className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-50 disabled:text-gray-500 resize-none"
        rows={6}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
      />
      <div className="absolute bottom-2 right-2 flex items-center gap-1">
        {saving && <Spinner size="sm" />}
        {saved && !saving && <CheckCircle className="h-4 w-4 text-green-500" />}
      </div>
    </div>
  )
}
