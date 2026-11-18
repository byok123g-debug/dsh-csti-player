/**
 * Card Survival · DeepSeek hands
 *
 * Bridges the in-game CSTIControl HTTP endpoint (127.0.0.1:17890) into DSH
 * tools. Screenshots are written into the desktop video project so they can
 * also become footage for the final film. Every narrative note is appended to
 * a JSONL journal and a plain-text journal at the same location.
 */
import { execFile } from 'node:child_process'
import { appendFileSync, mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const runFile = promisify(execFile)
const API = 'http://127.0.0.1:17890'
const HELPER = fileURLToPath(new URL('./send.ps1', import.meta.url))
const DRAG_HELPER = fileURLToPath(new URL('./drag.ps1', import.meta.url))
// This profile keeps its real Desktop on D: while USERPROFILE\Desktop is not
// the shell known folder. CSTI_DESKTOP overrides the destination on other PCs.
const DESKTOP = process.env.CSTI_DESKTOP ?? 'D:\\Desktop'
const ROOT = join(DESKTOP, 'ds小视频', 'play')
const CAPTURES = join(ROOT, 'captures')

function ensureDirs() {
  mkdirSync(CAPTURES, { recursive: true })
}

function stamp() {
  const d = new Date()
  const p = (n, w = 2) => String(n).padStart(w, '0')
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}-${p(d.getMilliseconds(), 3)}`
}

async function api(path, timeoutMs = 15000) {
  const response = await fetch(API + path, { signal: AbortSignal.timeout(timeoutMs) })
  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`CSTIControl ${path} -> HTTP ${response.status} ${text}`)
  }
  return response
}

function text(value) {
  return [{ type: 'text', text }]
}

function result(properties) {
  return {
    schema: {
      type: 'object',
      additionalProperties: false,
      properties: Object.fromEntries(
        Object.entries(properties).map(([key, type]) => [key, { type }]),
      ),
      required: Object.keys(properties),
    },
    render: (_args, value) => [{
      type: 'text',
      text: typeof value === 'string' ? value : JSON.stringify(value, null, 2),
    }],
  }
}

function journalPath(name) {
  ensureDirs()
  return join(ROOT, name)
}

function appendJournal(note, detail) {
  ensureDirs()
  const entry = {
    at: new Date().toISOString(),
    gameDay: process.env.CSTI_GAME_DAY ?? null,
    note,
    detail: detail ?? '',
  }
  appendFileSync(join(ROOT, 'journal.jsonl'), JSON.stringify(entry) + '\n', 'utf8')
  const line = `[${entry.at}]${entry.gameDay ? ` [${entry.gameDay}]` : ''} ${note}${detail ? `\n    ${detail}` : ''}\n`
  appendFileSync(join(ROOT, 'journal.txt'), line, 'utf8')
  return entry
}

async function sendKey(action, value) {
  try {
    const { stdout } = await runFile(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', HELPER, '-Action', action, '-Value', value],
      { timeout: 12000, windowsHide: true },
    )
    return stdout.trim()
  } catch (error) {
    throw new Error(`input helper failed: ${error.stderr?.trim() || error.message}`)
  }
}

export const inject = ['tools']

export function apply(ctx) {
  ensureDirs()
  const disposers = []

  disposers.push(ctx.tools.register({
    name: 'csti_observe',
    description: 'Capture the current Card Survival game screen. Returns a PNG path plus window geometry. Read the PNG with the image reader before deciding a move. Fails when the game or its CSTIControl bridge is not running.',
    parameters: {
      label: {
        type: 'string',
        description: 'Short slug for this shot, used in the filename (for example "dawn-beach"). Optional.',
      },
    },
    output: result({ path: 'string', width: 'number', height: 'number', at: 'string' }),
    async execute(args) {
      const screen = await (await api('/screen')).json()
      const png = Buffer.from(await (await api('/screenshot', 30000)).arrayBuffer())
      const safe = String(args?.label ?? 'view').replace(/[^a-zA-Z0-9_-]+/g, '-').slice(0, 40) || 'view'
      const path = join(CAPTURES, `${stamp()}-${safe}.png`)
      writeFileSync(path, png)
      return { path, width: screen.width, height: screen.height, at: new Date().toISOString() }
    },
  }))

  disposers.push(ctx.tools.register({
    name: 'csti_hold_drag',
    description: 'Drag a card and deliberately hover over the destination before releasing. Use this for combining cards, because the game reveals a combine action only while the dragged card rests on a valid target.',
    parameters: {
      x1: { type: 'number', required: true, description: 'Start X.' },
      y1: { type: 'number', required: true, description: 'Start Y.' },
      x2: { type: 'number', required: true, description: 'Destination X.' },
      y2: { type: 'number', required: true, description: 'Destination Y.' },
      holdMs: { type: 'number', description: 'How long to rest on the destination before release, 300-4000; defaults to 1200.' },
    },
    output: result({ ok: 'boolean', detail: 'string' }),
    async execute(args) {
      const x1 = Math.round(args.x1)
      const y1 = Math.round(args.y1)
      const x2 = Math.round(args.x2)
      const y2 = Math.round(args.y2)
      const hold = Math.max(300, Math.min(4000, Math.round(args.holdMs ?? 1200)))
      try {
        const { stdout } = await runFile(
          'powershell.exe',
          ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', DRAG_HELPER,
            '-X1', String(x1), '-Y1', String(y1), '-X2', String(x2), '-Y2', String(y2),
            '-HoldMs', String(hold)],
          { timeout: 30000, windowsHide: true },
        )
        return { ok: /^ok/.test(stdout.trim()), detail: stdout.trim() }
      } catch (error) {
        throw new Error(`drag helper failed: ${error.stderr?.trim() || error.message}`)
      }
    },
  }))

  disposers.push(ctx.tools.register({
    name: 'csti_click',
    description: 'Click at screenshot pixel coordinates in Card Survival. The game bridge converts screen pixels to the actual window, including scaling.',
    parameters: {
      x: { type: 'number', required: true, description: 'X in the captured screenshot pixel space.' },
      y: { type: 'number', required: true, description: 'Y in the captured screenshot pixel space.' },
      button: { type: 'string', enum: ['left', 'right', 'middle'], description: 'Mouse button; defaults to left.' },
      count: { type: 'number', description: 'Click count, 1-3; defaults to 1.' },
    },
    output: result({ ok: 'boolean', detail: 'string' }),
    async execute(args) {
      const button = args.button ?? 'left'
      const count = Math.max(1, Math.min(3, Math.round(args.count ?? 1)))
      const data = await (await api(`/click?x=${Math.round(args.x)}&y=${Math.round(args.y)}&button=${button}&count=${count}`)).json()
      return { ok: data.ok === true, detail: `${button} click at ${Math.round(args.x)},${Math.round(args.y)} x${count}` }
    },
  }))

  disposers.push(ctx.tools.register({
    name: 'csti_drag',
    description: 'Drag a card or item between two screenshot pixel coordinates in Card Survival.',
    parameters: {
      x1: { type: 'number', required: true, description: 'Start X.' },
      y1: { type: 'number', required: true, description: 'Start Y.' },
      x2: { type: 'number', required: true, description: 'End X.' },
      y2: { type: 'number', required: true, description: 'End Y.' },
      duration: { type: 'number', description: 'Drag duration in ms, 50-5000; defaults to 350.' },
    },
    output: result({ ok: 'boolean', detail: 'string' }),
    async execute(args) {
      const duration = Math.max(50, Math.min(5000, Math.round(args.duration ?? 350)))
      const query = `x1=${Math.round(args.x1)}&y1=${Math.round(args.y1)}&x2=${Math.round(args.x2)}&y2=${Math.round(args.y2)}&duration=${duration}`
      const data = await (await api(`/drag?${query}`)).json()
      return { ok: data.ok === true, detail: `drag ${Math.round(args.x1)},${Math.round(args.y1)} -> ${Math.round(args.x2)},${Math.round(args.y2)} in ${duration}ms` }
    },
  }))

  disposers.push(ctx.tools.register({
    name: 'csti_scroll',
    description: 'Scroll the mouse wheel over a screenshot coordinate in Card Survival. Positive delta scrolls up, negative scrolls down.',
    parameters: {
      x: { type: 'number', required: true, description: 'X in screenshot pixels.' },
      y: { type: 'number', required: true, description: 'Y in screenshot pixels.' },
      delta: { type: 'number', description: 'Wheel delta; defaults to -120 (down).' },
    },
    output: result({ ok: 'boolean', detail: 'string' }),
    async execute(args) {
      const delta = Math.round(args.delta ?? -120)
      const data = await (await api(`/scroll?x=${Math.round(args.x)}&y=${Math.round(args.y)}&delta=${delta}`)).json()
      return { ok: data.ok === true, detail: `scroll ${delta} at ${Math.round(args.x)},${Math.round(args.y)}` }
    },
  }))

  disposers.push(ctx.tools.register({
    name: 'csti_key',
    description: 'Press one key in the game window. Use Space/Enter to dismiss intro screens, Escape for menus, Tab, arrow keys, or a single letter. Focuses the game first.',
    parameters: {
      key: { type: 'string', required: true, description: 'Key name: Space, Enter, Escape, Tab, Up, Down, Left, Right, Backspace, F1, or one character.' },
    },
    output: result({ ok: 'boolean', detail: 'string' }),
    async execute(args) {
      const out = await sendKey('key', String(args.key))
      return { ok: /^ok/.test(out), detail: out || `pressed ${args.key}` }
    },
  }))

  disposers.push(ctx.tools.register({
    name: 'csti_type',
    description: 'Type literal text into the focused game field via the clipboard and Ctrl+V. Use for character or save names; ASCII is safest.',
    parameters: {
      text: { type: 'string', required: true, description: 'Text to paste into the game field.' },
    },
    output: result({ ok: 'boolean', detail: 'string' }),
    async execute(args) {
      const out = await sendKey('type', String(args.text))
      return { ok: /^ok/.test(out), detail: out || 'typed text' }
    },
  }))

  disposers.push(ctx.tools.register({
    name: 'csti_note',
    description: 'Append a story beat to the playthrough journal (JSONL and TXT). Call this after meaningful events: landfall, first fire, injury, discovery, night, rescue. Write in vivid first person, 1-3 sentences.',
    parameters: {
      note: { type: 'string', required: true, description: 'The story beat, first person, concise.' },
      detail: { type: 'string', description: 'Optional concrete game facts: day, hunger, injuries, items, location.' },
    },
    output: result({ ok: 'boolean', at: 'string', count: 'number' }),
    async execute(args) {
      const entry = appendJournal(String(args.note), args.detail ? String(args.detail) : '')
      const count = readFileSync(join(ROOT, 'journal.jsonl'), 'utf8').trim().split('\n').filter(Boolean).length
      return { ok: true, at: entry.at, count }
    },
  }))

  disposers.push(ctx.tools.register({
    name: 'csti_journal',
    description: 'Read back the playthrough journal. Returns the most recent beats; use it to keep continuity before writing the final story.',
    parameters: {
      limit: { type: 'number', description: 'How many recent entries to return, 1-100; defaults to 30.' },
    },
    output: result({ path: 'string', entries: 'string' }),
    async execute(args) {
      const limit = Math.max(1, Math.min(100, Math.round(args?.limit ?? 30)))
      const path = join(ROOT, 'journal.jsonl')
      if (!existsSync(path)) return { path, entries: '(empty)' }
      const lines = readFileSync(path, 'utf8').trim().split('\n').filter(Boolean).slice(-limit)
      const entries = lines.map((line) => {
        try {
          const e = JSON.parse(line)
          return `- ${e.note}${e.detail ? `\n  (${e.detail})` : ''}`
        } catch {
          return `- ${line}`
        }
      }).join('\n')
      return { path, entries }
    },
  }))

  ctx.effect(() => () => {
    for (const dispose of disposers) dispose()
  }, 'csti-deepseek-player.tools')
}
