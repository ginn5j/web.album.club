export interface Member {
  id: string
  userId: string
  displayName: string
  role: 'admin' | 'member'
  createdAt: string
}

export interface OutputSettings {
  owner: string
  repo: string
  postsPath: string
  // Repo folder the cover art is committed to; '' keeps the remote URL.
  assetsPath: string
  branch: string
  template?: string
}

export interface MemberSettings {
  publishPat?: string
  output?: OutputSettings
}
