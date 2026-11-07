// Push api/_voice/prompt.js to the Retell agent (general prompt + begin message), then publish it.
//   node scripts/updateRetellPrompt.mjs            dry run: shows what would change, touches nothing
//   node scripts/updateRetellPrompt.mjs --apply    updates the agent's LLM and publishes a new agent version
// Needs RETELL_API_KEY and RETELL_AGENT_ID in the environment (.env, server-side only). The key is never printed.
import process from 'node:process'
import { readFileSync } from 'node:fs'
import { GENERAL_PROMPT, BEGIN_MESSAGE, FLOW_TEXT } from '../api/_voice/prompt.js'

// Load .env without printing it.
try {
  for (const line of readFileSync(new URL('../.env', import.meta.url), 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
} catch { /* no .env: rely on the real environment */ }

const key = process.env.RETELL_API_KEY
const agentId = process.env.RETELL_AGENT_ID
const apply = process.argv.includes('--apply')
if (!key || !agentId) { console.error('RETELL_API_KEY and RETELL_AGENT_ID are required'); process.exit(1) }

const api = async (method, path, body) => {
  const res = await fetch(`https://api.retellai.com${path}`, {
    method,
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status} ${text.slice(0, 160)}`)
  return text ? JSON.parse(text) : null
}

const agent = await api('GET', `/get-agent/${agentId}`)
const engine = agent.response_engine || {}
console.log(`agent ${agentId} (v${agent.version}, published=${agent.is_published}) engine=${engine.type}`)

if (engine.type === 'conversation-flow') {
  // Live agent: start -> talk -> callback -> goodbye. Rewrite the global prompt and the three conversation nodes.
  const flowId = engine.conversation_flow_id
  const flow = await api('GET', `/get-conversation-flow/${flowId}`)
  const byId = new Map(flow.nodes.map((n) => [n.id, n]))
  const next = (n) => byId.get(n?.edges?.[0]?.destination_node_id)
  const start = byId.get(flow.start_node_id)
  const talk = next(start)
  const callback = next(talk)
  if (!start || !talk || !callback || [start, talk, callback].some((n) => n.type !== 'conversation')) {
    console.error('unexpected flow shape; not touching it'); process.exit(1)
  }
  const nodes = flow.nodes.map((n) => {
    if (n.id === start.id) return { ...n, instruction: FLOW_TEXT.welcome }
    if (n.id === talk.id) return { ...n, instruction: FLOW_TEXT.talk }
    if (n.id === callback.id) return { ...n, instruction: FLOW_TEXT.callback }
    return n
  })
  console.log(`flow ${flowId}: global_prompt ${String(flow.global_prompt || '').length} -> ${GENERAL_PROMPT.length} chars; rewriting 3 nodes`)
  console.log(`  welcome : ${JSON.stringify(start.instruction.text).slice(0, 70)} -> ${JSON.stringify(FLOW_TEXT.welcome.text)}`)
  if (!apply) { console.log('dry run only. add --apply to update and publish.'); process.exit(0) }
  await api('PATCH', `/update-conversation-flow/${flowId}`, { global_prompt: GENERAL_PROMPT, nodes })
  const pub = await api('POST', `/publish-agent/${agentId}`, {})
  console.log('updated and published', pub?.version != null ? `(version ${pub.version})` : '')
  process.exit(0)
}

const llmId = engine.llm_id
if (!llmId) { console.error('unsupported response engine'); process.exit(1) }
const llm = await api('GET', `/get-retell-llm/${llmId}`)
console.log(`llm ${llmId}: general_prompt ${String(llm.general_prompt || '').length} -> ${GENERAL_PROMPT.length} chars`)
console.log(`begin_message : ${JSON.stringify(llm.begin_message)} -> ${JSON.stringify(BEGIN_MESSAGE)}`)

if (!apply) { console.log('dry run only. add --apply to update and publish.'); process.exit(0) }

await api('PATCH', `/update-retell-llm/${llmId}`, { general_prompt: GENERAL_PROMPT, begin_message: BEGIN_MESSAGE })
const pub = await api('POST', `/publish-agent/${agentId}`, {})
console.log('updated and published', pub?.version != null ? `(version ${pub.version})` : '')
