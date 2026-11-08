// Push api/_voice/prompt.js to the Retell agent (general prompt + begin message), then publish it.
//   node scripts/updateRetellPrompt.mjs            dry run: shows what would change, touches nothing
//   node scripts/updateRetellPrompt.mjs --apply    updates the agent's LLM and publishes a new agent version
// For a conversation-flow agent it also (re)installs the secretary's custom functions (api/_voice/tools.js TOOL_DEFS):
// one flow tool + one function node per tool, reached from the `talk` node and returning to it. Safe to re-run:
// everything it adds has an id starting with "vs_" and is replaced, never duplicated.
// Tool URL base: VOICE_PUBLIC_BASE (default https://ilovetcas.com).
// Needs RETELL_API_KEY and RETELL_AGENT_ID in the environment (.env, server-side only). The key is never printed.
import process from 'node:process'
import { readFileSync } from 'node:fs'
import { GENERAL_PROMPT, BEGIN_MESSAGE, FLOW_TEXT } from '../api/_voice/prompt.js'
import { TOOL_DEFS } from '../api/_voice/tools.js'

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
  const base = (process.env.VOICE_PUBLIC_BASE || 'https://ilovetcas.com').replace(/\/$/, '')
  const TOOL_WHEN = {
    get_schedule: 'น้องถามว่าวันนี้หรือวันอื่นมีงานอะไรในแผน ขอดูตารางงาน',
    get_admission_news: 'น้องถามข่าวรับสมัคร วันสอบ วันประกาศผล หรือวันสำคัญของ TCAS',
    add_task: 'น้องอยากเพิ่มงานใหม่ และยืนยันชื่องานกับวันแล้ว',
    move_tasks: 'น้องอยากเลื่อนงานหรือเลื่อนนัด และยืนยันวันใหม่แล้ว',
    complete_task: 'น้องบอกว่าทำงานใดงานหนึ่งเสร็จแล้ว',
  }
  const isOurs = (x) => String(x.id || x.tool_id || '').startsWith('vs_')
  const tools = [
    ...(flow.tools || []).filter((t) => !String(t.tool_id || '').startsWith('vs_')),
    ...TOOL_DEFS.map((d) => ({
      type: 'custom', tool_id: `vs_${d.name}`, name: d.name, description: d.description, url: `${base}/api/voice/tool`,
      method: 'POST', parameters: d.parameters, speak_during_execution: true, execution_message_type: 'prompt',
      execution_message_description: 'พูดสั้นๆ ให้น้องรู้ว่าพี่กำลังเปิดดูหรือบันทึกให้ เช่น "ขอพี่ดูแป๊บนะคะ"', timeout_ms: 20000, max_retry: 0,
    })),
  ]
  const fnNodes = TOOL_DEFS.map((d) => ({
    id: `vs_fn_${d.name}`, type: 'function', name: `ใช้ ${d.name}`, tool_id: `vs_${d.name}`, tool_type: 'local',
    wait_for_result: true, speak_during_execution: true,
    instruction: { type: 'prompt', text: 'พูดสั้นๆ ว่ากำลังทำให้ แล้วเรียกฟังก์ชัน' },
    edges: [{ id: `vs_edge_${d.name}_back`, transition_condition: { type: 'prompt', prompt: 'ได้ผลจากฟังก์ชันแล้ว' }, destination_node_id: talk.id }],
    else_edge: { id: `vs_edge_${d.name}_else`, transition_condition: { type: 'prompt', prompt: 'Else' }, destination_node_id: talk.id },
  }))
  const toolEdges = TOOL_DEFS.map((d) => ({
    id: `vs_edge_talk_${d.name}`, transition_condition: { type: 'prompt', prompt: TOOL_WHEN[d.name] }, destination_node_id: `vs_fn_${d.name}`,
  }))
  const nodes = [
    ...flow.nodes.filter((n) => !isOurs(n)).map((n) => {
      if (n.id === start.id) return { ...n, instruction: FLOW_TEXT.welcome }
      if (n.id === talk.id) return { ...n, instruction: FLOW_TEXT.talk, edges: [...(n.edges || []).filter((e) => !isOurs(e)), ...toolEdges] }
      if (n.id === callback.id) return { ...n, instruction: FLOW_TEXT.callback }
      return n
    }),
    ...fnNodes,
  ]
  console.log(`tools: ${tools.map((t) => t.name).join(', ')} -> ${base}/api/voice/tool; function nodes: ${fnNodes.length}`)
  console.log(`flow ${flowId}: global_prompt ${String(flow.global_prompt || '').length} -> ${GENERAL_PROMPT.length} chars; rewriting 3 nodes`)
  console.log(`  welcome : ${JSON.stringify(start.instruction.text).slice(0, 70)} -> ${JSON.stringify(FLOW_TEXT.welcome.text)}`)
  if (!apply) { console.log('dry run only. add --apply to update and publish.'); process.exit(0) }
  // Published agents and flows are frozen (Retell versioning): work on a DRAFT agent version (its flow gets
  // a draft version too), then publish the draft. A draft that already exists is reused.
  const draft = agent.is_published ? await api('POST', `/create-agent-version/${agentId}`, { base_version: agent.version }) : agent
  const flowVersion = draft.response_engine?.version
  console.log(`draft agent v${draft.version} (flow version ${flowVersion})`)
  await api('PATCH', `/update-conversation-flow/${flowId}?version=${flowVersion}`, { global_prompt: GENERAL_PROMPT, nodes, tools })
  console.log('flow draft updated')
  await api('POST', `/publish-agent-version/${agentId}`, { version: draft.version })
  console.log(`published agent version ${draft.version}`)
  process.exit(0)
}

const llmId = engine.llm_id
if (!llmId) { console.error('unsupported response engine'); process.exit(1) }
const llm = await api('GET', `/get-retell-llm/${llmId}`)
console.log(`llm ${llmId}: general_prompt ${String(llm.general_prompt || '').length} -> ${GENERAL_PROMPT.length} chars`)
console.log(`begin_message : ${JSON.stringify(llm.begin_message)} -> ${JSON.stringify(BEGIN_MESSAGE)}`)

if (!apply) { console.log('dry run only. add --apply to update and publish.'); process.exit(0) }

await api('PATCH', `/update-retell-llm/${llmId}`, { general_prompt: GENERAL_PROMPT, begin_message: BEGIN_MESSAGE })
console.log('LLM prompt updated (draft). publish it from the Retell dashboard.')
