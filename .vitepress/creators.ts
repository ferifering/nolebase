export interface SocialEntry {
  type: 'github' | 'twitter' | 'email'
  icon: string
  link: string
}

export interface Creator {
  avatar: string
  name: string
  username?: string
  title?: string
  org?: string
  desc?: string
  links?: SocialEntry[]
  nameAliases?: string[]
  emailAliases?: string[]
}

const getAvatarUrl = (name: string) => `https://github.com/${name}.png`

export const creators: Creator[] = [
  {
    name: 'YJ',
    avatar: '',
    username: 'ferifering',
    title: '在写笔记喵',
    desc: '后端开发者喵',
    links: [
      { type: 'github', icon: 'github', link: 'https://github.com/ferifering' },
    ],
    nameAliases: ['YJ', 'YJ_disco'],
    emailAliases: ['368443427@qq.com'],
  },
].map<Creator>((c) => {
  c.avatar = c.avatar || getAvatarUrl(c.username)
  return c as Creator
})

export const creatorNames = creators.map(c => c.name)
export const creatorUsernames = creators.map(c => c.username || '')
