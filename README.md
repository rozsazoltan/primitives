# Skills

Curated agent skills maintained by [rozsazoltan](https://github.com/rozsazoltan).

Each skill is its own top-level directory in this repository and follows the standard `SKILL.md` layout used by agent hosts such as [OpenCode](https://opencode.ai/) and [APM](https://github.com/microsoft/apm).

## Skills

| Skill | Covers |
| --- | --- |
| `marketing-content` | Content marketing agents for authorship, editorial production and growth experiments |
| `marketing-ecommerce` | Ecommerce marketing agents for cross-border storefronts and live-stream selling |
| `marketing-seo` | Search marketing agents for technical SEO, AI citations, app stores, Baidu and video search |
| `marketing-social-media` | Social media agents for short video, carousels, LinkedIn, Reddit, podcasts and platform strategy |

The four marketing skills are generated from
[vectorize-io/self-driving-agents](https://github.com/vectorize-io/self-driving-agents);
`.github/workflows/sync-marketing-skills.yml` refreshes them daily and touches no
other directory. See [NOTICE.md](NOTICE.md).

## Installation

Install a skill directly with APM:

```bash
apm install rozsazoltan/skills/<skill-name> --target opencode
```

Replace `<skill-name>` with the skill directory name. A skill that needs other skills declares them in its own `apm.yml`, so installing it installs everything it depends on.

## License

Licensed under the GNU Affero General Public License, version 3 or later. See [LICENSE](LICENSE).
