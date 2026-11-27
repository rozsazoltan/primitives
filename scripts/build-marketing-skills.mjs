#!/usr/bin/env node
/**
 * Regenerates the four marketing agent packages from vectorize-io/self-driving-agents.
 *
 * Each package deploys OpenCode subagents through APM's `.apm/agents/` layout.
 * Only the directories listed in OWNED are written; every other skill in this
 * repository is left alone. Upstream content is MIT; see NOTICE.md.
 *
 * Usage: node scripts/build-marketing-skills.mjs [--check]
 *   --check  exit 1 when the committed packages differ from upstream
 */

import { cp, mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const UPSTREAM = "vectorize-io/self-driving-agents"
const REF = process.env.UPSTREAM_REF ?? "main"
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..")
const CHECK = process.argv.includes("--check")

/** Package directory at the repository root, the upstream folder it mirrors, and its own description. */
const OWNED = [
  {
    package: "marketing-seo",
    topic: "seo",
    description: "Search marketing subagents for technical SEO, AI citations, app stores, Baidu and video search.",
  },
  {
    package: "marketing-content",
    topic: "content",
    description: "Content marketing subagents for long-form authorship, editorial production and growth experiments.",
  },
  {
    package: "marketing-ecommerce",
    topic: "ecommerce",
    description: "Ecommerce marketing subagents for cross-border storefronts and live-stream selling.",
  },
  {
    package: "marketing-social-media",
    topic: "social-media",
    description: "Social media subagents for short video, carousels, LinkedIn, Reddit, podcasts and platform strategy.",
  },
]

const headers = { accept: "application/vnd.github+json", "user-agent": "rozsazoltan-skills-build" }
if (process.env.GITHUB_TOKEN) headers.authorization = `Bearer ${process.env.GITHUB_TOKEN}`

async function download(url) {
  const response = await fetch(url, { headers })
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${url}`)
  return response.text()
}

function frontmatter(text) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text)
  if (!match) return {}
  const fields = {}
  for (const line of match[1].split(/\r?\n/)) {
    const pair = /^([A-Za-z_-]+):\s*(.*)$/.exec(line)
    if (pair) fields[pair[1]] = pair[2].trim().replace(/^["']|["']$/g, "")
  }
  return fields
}

/** Body without frontmatter. */
function body(text) {
  const match = /^---\r?\n[\s\S]*?\r?\n---\r?\n?/.exec(text)
  return match ? text.slice(match[0].length) : text
}

function focus(text, limit = 140) {
  const clean = text.replace(/\s+/g, " ").trim()
  const stop = clean.indexOf(". ")
  const sentence = stop === -1 ? clean : clean.slice(0, stop)
  if (sentence.length <= limit) return sentence
  const cut = sentence.slice(0, limit)
  return `${cut.slice(0, cut.lastIndexOf(" "))}…`
}

function agentFile(entry, sha, agent) {
  return `---
description: ${agent.name} — ${focus(agent.description, 300)}
mode: subagent
---
<!-- Source: ${UPSTREAM}@${sha} marketing/${entry.topic}/${agent.slug}.md (MIT). Upstream frontmatter is dropped because OpenCode rejects Claude-style tools and hex colours. -->
<!-- Memory tools (agent_knowledge_*, recall) are not installed with this agent. When they are unavailable, work from the task and the user's own numbers, and say which facts you could not verify. -->

${body(agent.text)}`
}

function agentManifest(entry) {
  return `name: ${entry.package}
version: 1.0.0
description: ${entry.description}
author: rozsazoltan
`
}

async function build() {
  const tree = JSON.parse(await download(`https://api.github.com/repos/${UPSTREAM}/git/trees/${REF}?recursive=1`))
  const sha = tree.sha
  const scratch = await mkdtemp(join(tmpdir(), "marketing-agents-"))
  for (const entry of OWNED) {
    const prefix = `marketing/${entry.topic}/`
    const paths = tree.tree
      .filter((node) => node.type === "blob" && node.path.startsWith(prefix) && node.path.endsWith(".md"))
      .map((node) => node.path)
      .sort()
    if (paths.length === 0) throw new Error(`No upstream files under ${prefix}`)
    const dir = join(scratch, entry.package)
    await mkdir(join(dir, ".apm", "agents"), { recursive: true })
    await writeFile(join(dir, "apm.yml"), agentManifest(entry))
    for (const path of paths) {
      const text = await download(`https://raw.githubusercontent.com/${UPSTREAM}/${sha}/${path}`)
      const slug = path.slice(prefix.length).replace(/\.md$/, "")
      const fields = frontmatter(text)
      const agent = { slug, name: fields.name ?? slug, description: fields.description ?? "", text }
      await writeFile(join(dir, ".apm", "agents", `${slug}.agent.md`), agentFile(entry, sha, agent))
    }
    console.log(`${entry.package}: ${paths.length} agents`)
  }
  return { sha, scratch }
}

/** Lists `<package>/<relative path>` for the owned packages, so only those paths are compared or replaced. */
async function snapshot(base) {
  const files = new Map()
  for (const { package: name } of OWNED) {
    const walk = async (relative) => {
      for (const item of await readdir(join(base, name, relative), { withFileTypes: true })) {
        const path = join(relative, item.name)
        if (item.isDirectory()) await walk(path)
        else files.set(`${name}/${path}`, await readFile(join(base, name, path), "utf8"))
      }
    }
    await walk("")
  }
  return files
}

async function main() {
  const { sha, scratch } = await build()
  try {
    const fresh = await snapshot(scratch)
    if (CHECK) {
      const committed = await snapshot(ROOT)
      for (const path of committed.keys()) if (!fresh.has(path)) console.log(`stale: ${path}`)
      for (const path of fresh.keys()) if (committed.get(path) !== fresh.get(path)) console.log(`changed: ${path}`)
      const drift = committed.size !== fresh.size || [...fresh.keys()].some((path) => committed.get(path) !== fresh.get(path))
      console.log(drift ? "Out of date; run scripts/build-marketing-skills.mjs" : "Up to date")
      process.exitCode = drift ? 1 : 0
      return
    }
    for (const { package: name } of OWNED) {
      await rm(join(ROOT, name), { recursive: true, force: true })
      await cp(join(scratch, name), join(ROOT, name), { recursive: true })
    }
    console.log(`Synced from ${UPSTREAM}@${sha}`)
  } finally {
    await rm(scratch, { recursive: true, force: true })
  }
}

await main()
