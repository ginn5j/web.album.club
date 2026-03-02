import { Trash2, ArrowUpCircle } from 'lucide-react'
import type { WishlistItem as WishlistItemType } from '../types/wishlist'
import { Button } from './ui/Button'

interface WishlistItemProps {
  item: WishlistItemType
  onRemove: (id: string) => void
  onPromote: (item: WishlistItemType) => void
}

export function WishlistItem({ item, onRemove, onPromote }: WishlistItemProps) {
  const { album } = item
  return (
    <div className="flex items-center gap-4 p-4 bg-white rounded-lg border border-gray-200">
      {album.coverArtUrl && (
        <img
          src={album.coverArtUrl}
          alt={album.title}
          className="h-14 w-14 rounded object-cover shrink-0"
        />
      )}
      <div className="flex-1 min-w-0">
        <div className="font-medium text-gray-900 truncate">{album.title}</div>
        <div className="text-sm text-gray-500">
          {album.artist}
          {album.releaseYear ? ` · ${album.releaseYear}` : ''}
        </div>
        {item.note && <p className="text-xs text-gray-400 mt-0.5 truncate">{item.note}</p>}
      </div>
      <div className="flex gap-2 shrink-0">
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
  )
}
