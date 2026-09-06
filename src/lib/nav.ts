import { WEDDING, isTodo } from './config'

// The navigation is derived, not hand-maintained. A wedding everyone drives to
// has no flights page; a couple who never write the story page never show a
// link to an empty one. Nobody has to remember to delete a link — the config
// decides.

export type NavLink = { href: string; label: string }

const storyWritten = () =>
  WEDDING.story.paragraphs.some((p) => !isTodo(p) && p.trim().length > 0)

const registryReady = () => WEDDING.registry.links.some((l) => !isTodo(l.url))

export function navLinks(): NavLink[] {
  const links: NavLink[] = [
    { href: '/rsvp', label: 'RSVP' },
    { href: '/schedule', label: 'Schedule' },
    { href: '/stay', label: 'Where to stay' },
  ]

  if (WEDDING.travel.flyIn) {
    links.push({ href: '/travel', label: 'Travel' })
    links.push({ href: '/arrivals', label: 'Arrivals' })
  }

  if (registryReady()) links.push({ href: '/registry', label: 'Registry' })
  if (storyWritten()) links.push({ href: '/story', label: 'Us' })

  links.push({ href: '/guests', label: 'Who’s coming' })
  links.push({ href: '/faq', label: 'FAQ' })

  return links
}

export { storyWritten, registryReady }
