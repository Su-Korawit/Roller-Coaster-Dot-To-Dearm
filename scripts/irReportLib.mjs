export function parseArgs(argv) {
  const args = argv.slice(2)
  if (args.length === 0) {
    throw new Error('missing command')
  }

  const cmd = args[0]

  switch (cmd) {
    case 'ensure':
      return { command: 'ensure' }
    case 'list':
      return { command: 'list', includeDone: args.includes('--include-done') }
    case 'read': {
      const ideaId = args[1]
      if (!ideaId) throw new Error('read requires ideaId')
      return { command: 'read', ideaId }
    }
    case 'set-status': {
      const ideaId = args[1]
      const status = args[2]
      if (!ideaId || !status) throw new Error('set-status requires ideaId and status')
      return { command: 'set-status', ideaId, status }
    }
    case 'append-update': {
      const ideaId = args[1]
      const summary = args.slice(2).join(' ').trim()
      if (!ideaId || !summary) throw new Error('append-update requires ideaId and summary')
      return { command: 'append-update', ideaId, summary }
    }
    case 'append-success': {
      const ideaId = args[1]
      const summary = args.slice(2).join(' ').trim()
      if (!ideaId || !summary) throw new Error('append-success requires ideaId and summary')
      return { command: 'append-success', ideaId, summary }
    }
    default:
      throw new Error(`unknown command: ${cmd}`)
  }
}

export function formatIdeaRead(subtree) {
  const { root, nodes } = subtree
  const blocks = nodes
    .filter((n) => n.id !== root.id)
    .map((n) => ({ id: n.id, type: n.type, data: n.data }))
  return {
    idea: { id: root.id, type: root.type, data: root.data },
    blocks,
  }
}
