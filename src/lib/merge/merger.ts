import type { CurrentAlbum } from '../../types/album'
import type { Member } from '../../types/member'
import type { DiscussionData, MemberDiscussionData, TagsFile, NotesFile } from '../../types/discussion'

export function mergeDiscussion(
  currentAlbum: CurrentAlbum,
  memberData: Array<{
    member: Member
    tags: TagsFile | null
    notes: NotesFile | null
  }>,
  discussedAt: string,
): DiscussionData {
  const members: Record<string, MemberDiscussionData> = {}

  for (const { member, tags, notes } of memberData) {
    members[member.login] = {
      name: member.name,
      tags: tags?.tags ?? {},
      notes: notes?.notes ?? '',
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
