# Primitives

Curated agent primitives maintained by [rozsazoltan](https://github.com/rozsazoltan).

Each primitive is its own directory and follows the layout used by agent hosts such as [OpenCode](https://opencode.ai/) and [APM](https://github.com/microsoft/apm).

## Layout

| Directory | Holds |
| --- | --- |
| `agents/` | Subagent packages (`.apm/agents/*.agent.md`) |
| `skills/` | Skill packages (`SKILL.md`) |
| `commands/` | Command packages |
| `instructions/` | Instruction packages |

An empty directory keeps a `.gitkeep` so the layout stays visible.

## Agents

| Package | Covers |
| --- | --- |
| `agents/marketing-content` | Content marketing agents for authorship, editorial production and growth experiments |
| `agents/marketing-ecommerce` | Ecommerce marketing agents for cross-border storefronts and live-stream selling |
| `agents/marketing-seo` | Search marketing agents for technical SEO, AI citations, app stores, Baidu and video search |
| `agents/marketing-social-media` | Social media agents for short video, carousels, LinkedIn, Reddit, podcasts and platform strategy |

Each package deploys OpenCode subagents through APM's `.apm/agents/` layout:

```bash
apm install rozsazoltan/primitives/agents/marketing-seo --target opencode
```

The agents land in `.opencode/agents/<name>.md` and appear as subagents in the session. The four marketing packages are generated from
[vectorize-io/self-driving-agents](https://github.com/vectorize-io/self-driving-agents);
`.github/workflows/sync-marketing-skills.yml` refreshes them daily and touches no
other directory. See [NOTICE.md](NOTICE.md).

## Installation

Install a package directly with APM:

```bash
apm install rozsazoltan/primitives/<primitive>/<package> --target opencode
```

Replace the placeholders with the directory path. A package that needs other packages declares them in its own `apm.yml`, so installing it installs everything it depends on.

## License

Licensed under the GNU Affero General Public License, version 3 or later. See [LICENSE](LICENSE).
