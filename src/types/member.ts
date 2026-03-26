export interface Member {
  login: string
  name: string
  branch: string
}

export interface MembersConfig {
  members: Member[]
}

export interface MemberSettings {
  name: string
  output?: {
    owner: string
    repo: string
    postsPath: string
    branch: string
    template?: string
  }
}
