#!/usr/bin/env node
/**
 * Regenerates the four marketing skills from vectorize-io/self-driving-agents.
 *
 * Only the directories listed in OWNED are written; every other skill in this
 * repository is left alone. Upstream content is MIT; see NOTICE.
 *
 * Usage: node scripts/build-marketing-skills.mjs [--check]
 *   --check  exit 1 when the committed skills differ from upstream
 */

import { execFile } from "node:child_process"
import { cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const UPSTREAM = "vectorize-io/self-driving-agents"
const REF = process.env.UPSTREAM_REF ?? "main"
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..")
const CHECK = process.argv.includes("--check")

/** Skill directory at the repository root, the upstream folder it mirrors, and its own description. */
const OWNED = [
  {
    skill: "marketing-seo",
    title: "Marketing SEO",
    topic: "seo",
    description:
      "Search marketing agents for technical SEO, AI citation strategy, app store optimization, Baidu and video search. Load the reference that matches the task.",
    agentDescription: "Search marketing subagents for technical SEO, AI citations, app stores, Baidu and video search.",
  },
  {
    skill: "marketing-content",
    title: "Marketing Content",
    topic: "content",
    description:
      "Content marketing agents for long-form authorship, editorial production and growth experiments. Load the reference that matches the task.",
    agentDescription: "Content marketing subagents for long-form authorship, editorial production and growth experiments.",
  },
  {
    skill: "marketing-ecommerce",
    title: "Marketing Ecommerce",
    topic: "ecommerce",
    description:
      "Ecommerce marketing agents for cross-border storefronts and live-stream selling. Load the reference that matches the task.",
    agentDescription: "Ecommerce marketing subagents for cross-border storefronts and live-stream selling.",
  },
  {
    skill: "marketing-social-media",
    title: "Marketing Social Media",
    topic: "social-media",
    description:
      "Social media agents for short video, carousels, LinkedIn, Reddit, podcasts and platform strategy. Load the reference that matches the task.",
    agentDescription: "Social media subagents for short video, carousels, LinkedIn, Reddit, podcasts and platform strategy.",
  },
]

/** Every directory this script owns, so no other skill in the repository is touched. */
const DIRS = OWNED.flatMap((entry) => [entry.skill, `${entry.skill}-agents`])

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

function focus(text, limit = 140) {
  const clean = text.replace(/\s+/g, " ").trim()
  const stop = clean.indexOf(". ")
  const sentence = stop === -1 ? clean : clean.slice(0, stop)
  if (sentence.length <= limit) return sentence
  const cut = sentence.slice(0, limit)
  return `${cut.slice(0, cut.lastIndexOf(" "))}…`
}

/** Upstream body without its frontmatter. */
function body(text) {
  const match = /^---\r?\n[\s\S]*?\r?\n---\r?\n?/.exec(text)
  return match ? text.slice(match[0].length) : text
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
  return `name: ${entry.skill}-agents
version: 1.0.0
description: ${entry.agentDescription}
author: rozsazoltan
`
}

function skillFile(entry, sha, agents) {
  const rows = agents
    .map((agent) => `| [${agent.slug}](references/${agent.slug}.md) | ${agent.name} | ${focus(agent.description)} |`)
    .join("\n")
  return `---
name: ${entry.skill}
description: ${entry.description}
---

# ${entry.title}

${entry.description}

## References

Each file is one upstream agent: its role, working process and output format. Load only the references the task needs, one or two at a time, and follow the loaded agent's process rather than restating it.

| Reference | Agent | Focus |
| --- | --- | --- |
${rows}

## Working rules

- Pick the narrowest reference for the job; combine two only when the task crosses their scope.
- Keep the loaded agent's output format and quality bar.
- These agents expect a Hindsight memory layer (\`agent_knowledge_*\`, recall). When those tools are unavailable, work from the reference text and the user's own numbers, and say which facts you could not verify.

<!-- Generated from ${UPSTREAM}@${sha}. Do not edit by hand; run scripts/build-marketing-skills.mjs. -->
`
}

async function build() {
  const tree = JSON.parse(await download(`https://api.github.com/repos/${UPSTREAM}/git/trees/${REF}?recursive=1`))
  const sha = tree.sha
  const scratch = await mkdtemp(join(tmpdir(), "marketing-skills-"))
  for (const entry of OWNED) {
    const prefix = `marketing/${entry.topic}/`
    const paths = tree.tree
      .filter((node) => node.type === "blob" && node.path.startsWith(prefix) && node.path.endsWith(".md"))
      .map((node) => node.path)
      .sort()
    if (paths.length === 0) throw new Error(`No upstream files under ${prefix}`)
    const agents = []
    for (const path of paths) {
      const text = await download(`https://raw.githubusercontent.com/${UPSTREAM}/${sha}/${path}`)
      agents.push({
        slug: path.slice(prefix.length).replace(/\.md$/, ""),
        name: frontmatter(text).name ?? path.slice(prefix.length, -3),
        description: frontmatter(text).description ?? "",
        text,
        body: `<!-- Source: ${UPSTREAM}@${sha} ${path} (MIT). Verbatim. -->\n${text}`,
      })
    }
    const dir = join(scratch, entry.skill)
    await mkdir(join(dir, "references"), { recursive: true })
    await writeFile(join(dir, "SKILL.md"), skillFile(entry, sha, agents))
    for (const agent of agents) await writeFile(join(dir, "references", `${agent.slug}.md`), agent.body)

    const agentDir = join(scratch, `${entry.skill}-agents`)
    await mkdir(join(agentDir, ".apm", "agents"), { recursive: true })
    await writeFile(join(agentDir, "apm.yml"), agentManifest(entry))
    for (const agent of agents) {
      await writeFile(join(agentDir, ".apm", "agents", `${agent.slug}.agent.md`), agentFile(entry, sha, agent))
    }
    console.log(`${entry.skill}: ${agents.length} references, ${agents.length} agents`)
  }
  return { sha, scratch }
}

/** Lists `<dir>/<relative path>` for the owned directories, so only those paths are compared or replaced. */
async function snapshot(base) {
  const files = new Map()
  for (const dir of DIRS) {
    const walk = async (relative) => {
      for (const item of await readdir(join(base, dir, relative), { withFileTypes: true })) {
        const path = join(relative, item.name)
        if (item.isDirectory()) await walk(path)
        else files.set(`${dir}/${path}`, await readFile(join(base, dir, path), "utf8"))
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
      const drift = [...fresh.keys()].some((path) => committed.get(path) !== fresh.get(path)) || committed.size !== fresh.size
      for (const path of committed.keys()) if (!fresh.has(path)) console.log(`stale: ${path}`)
      for (const path of fresh.keys()) if (committed.get(path) !== fresh.get(path)) console.log(`changed: ${path}`)
      console.log(drift ? "Out of date; run scripts/build-marketing-skills.mjs" : "Up to date")
      process.exitCode = drift ? 1 : 0
      return
    }
    for (const dir of DIRS) {
      await rm(join(ROOT, dir), { recursive: true, force: true })
      await cp(join(scratch, dir), join(ROOT, dir), { recursive: true })
    }
    console.log(`Synced from ${UPSTREAM}@${sha}`)
  } finally {
    await rm(scratch, { recursive: true, force: true })
  }
}

await main()
