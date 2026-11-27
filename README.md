# Primitives

Curated agent primitives maintained by [rozsazoltan](https://github.com/rozsazoltan).

Each primitive is its own top-level directory in this repository and follows the layout used by agent hosts such as [OpenCode](https://opencode.ai/) and [APM](https://github.com/microsoft/apm). A package can ship skills, subagents, commands or instructions; whatever it ships lives inside its own directory.

## Agents

| Package | Covers |
| --- | --- |
| `marketing-content` | Content marketing agents for authorship, editorial production and growth experiments |
| `marketing-ecommerce` | Ecommerce marketing agents for cross-border storefronts and live-stream selling |
| `marketing-seo` | Search marketing agents for technical SEO, AI citations, app stores, Baidu and video search |
| `marketing-social-media` | Social media agents for short video, carousels, LinkedIn, Reddit, podcasts and platform strategy |

Each package deploys OpenCode subagents through APM's `.apm/agents/` layout:

```bash
apm install rozsazoltan/primitives/marketing-seo --target opencode
```

The agents land in `.opencode/agents/<name>.md` and appear as subagents in the session. The `skills/` directory is reserved for skill-form packages; it currently holds only a placeholder. The four packages are generated from
[vectorize-io/self-driving-agents](https://github.com/vectorize-io/self-driving-agents);
`.github/workflows/sync-marketing-skills.yml` refreshes them daily and touches no
other directory. See [NOTICE.md](NOTICE.md).

## Installation

Install a package directly with APM:

```bash
apm install rozsazoltan/primitives/<package-name> --target opencode
```

Replace `<package-name>` with the directory name. A package that needs other packages declares them in its own `apm.yml`, so installing it installs everything it depends on.

## License

Licensed under the GNU Affero General Public License, version 3 or later. See [LICENSE](LICENSE).
