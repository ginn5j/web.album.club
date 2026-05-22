import type { CurrentAlbum } from '../../types/album'
import type { Member } from '../../types/member'
import type { DiscussionData, MemberDiscussionData, TagValue } from '../../types/discussion'

export function mergeDiscussion(
  currentAlbum: CurrentAlbum,
  memberData: Array<{
    member: Member
    tags: Record<string, TagValue> | null
    notes: string | null
  }>,
  discussedAt: string,
): DiscussionData {
  const members: Record<string, MemberDiscussionData> = {}

  for (const { member, tags, notes } of memberData) {
    members[member.displayName] = {
      name: member.displayName,
      tags: tags ?? {},
      notes: notes ?? '',
    }
  }

  return {
    schemaVersion: 1,
    albumId: currentAlbum.id,
    album: currentAlbum.album,
    songs: currentAlbum.songs,
    pickedBy: currentAlbum.selectedBy,
    discussedAt,
    members,
  }
}
