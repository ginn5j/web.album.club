import { useState } from 'react'
import { Trash2, ArrowUpCircle, Pencil, Check, X, GripVertical, ChevronUp, ChevronDown } from 'lucide-react'
import type { WishlistItem as WishlistItemType } from '../types/wishlist'
import { Button } from './ui/Button'

interface WishlistItemProps {
  item: WishlistItemType
  onRemove: (id: string) => void
  onPromote: (item: WishlistItemType) => void
  onUpdateNote: (id: string, note: string) => void
  onDragHandleMouseDown?: React.MouseEventHandler
  isDragging?: boolean
  onMoveUp?: () => void
  onMoveDown?: () => void
}

export function WishlistItem({ item, onRemove, onPromote, onUpdateNote, onDragHandleMouseDown, isDragging, onMoveUp, onMoveDown }: WishlistItemProps) {
  const { album } = item
  const [editing, setEditing] = useState(false)
  const [noteText, setNoteText] = useState(item.note ?? '')

  function handleSave() {
    onUpdateNote(item.id, noteText)
    setEditing(false)
  }

  function handleCancel() {
    setNoteText(item.note ?? '')
    setEditing(false)
  }

  return (
    <div className={`p-4 bg-white rounded-lg border border-gray-200${isDragging ? ' opacity-50' : ''}`}>
      <div className="flex items-center gap-4">
        <div className="flex flex-col items-center gap-0.5 shrink-0">
          <button
            onClick={onMoveUp}
            disabled={!onMoveUp}
            title="Move up"
            className="rounded p-0.5 text-gray-300 hover:text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </button>
          <GripVertical
            className="h-5 w-5 text-gray-300 cursor-grab touch-none"
            onMouseDown={onDragHandleMouseDown}
          />
          <button
            onClick={onMoveDown}
            disabled={!onMoveDown}
            title="Move down"
            className="rounded p-0.5 text-gray-300 hover:text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </div>
        {album.coverArtUrl && (
          <img
            src={album.coverArtUrl}
            alt={album.title}
            className="h-14 w-14 rounded object-cover shrink-0"
            onError={(e) => { e.currentTarget.hidden = true }}
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="font-medium text-gray-900 truncate">{album.title}</div>
          <div className="text-sm text-gray-500">
            {album.artist}
            {album.releaseYear ? ` · ${album.releaseYear}` : ''}
          </div>
          {!editing && item.note && (
            <p className="text-xs text-gray-400 mt-0.5 truncate">{item.note}</p>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setEditing(true)}
            title="Edit note"
          >
            <Pencil className="h-4 w-4 text-gray-400" />
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => onPromote(item)}
            title="Pick as current album"
          >
            <ArrowUpCircle className="h-4 w-4" />
            Pick
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onRemove(item.id)}
            title="Remove from wishlist"
          >
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      </div>

      {editing && (
        <div className="mt-3 space-y-2">
          <textarea
            className="w-full text-sm border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            rows={2}
            placeholder="Add a note…"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            autoFocus
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave}>
              <Check className="h-4 w-4" />
              Save
            </Button>
            <Button size="sm" variant="ghost" onClick={handleCancel}>
              <X className="h-4 w-4" />
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
