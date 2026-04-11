# AI Threat Modeler

**Desktop application for AI system threat modeling and attack surface analysis**

[![License: Source-Available](https://img.shields.io/badge/License-Source--Available-blue.svg)](LICENSE)
![GitHub last commit](https://img.shields.io/github/last-commit/nshalabi/ai-threat-modeler)
![GitHub stars](https://img.shields.io/github/stars/nshalabi/ai-threat-modeler?style=social)
[![Sponsor](https://img.shields.io/badge/Sponsor-%E2%9D%A4-pink?logo=github)](https://github.com/sponsors/nshalabi)

AI Threat Modeler is a visual threat modeling tool specialized for AI systems, LLM applications, RAG architectures, agents, and model pipelines. It allows security professionals to model AI systems with components, trust boundaries, and data flows, then run automated analysis to identify threats, weaknesses, and recommended mitigations. Findings map to established frameworks including MITRE ATLAS, OWASP LLM/GenAI guidance, NIST AI RMF, and NIST CSF. The tool is fully local and offline with no cloud dependency.

![AI Threat Modeler canvas](screenshot/main.png)

## Key Features

- Visual drag-and-drop modeling canvas
- 40+ AI-specific and standard component types
- Trust boundaries and data flow metadata
- Deterministic rule-based analysis engine
- Transparent findings with rule IDs and rationale
- Extensible knowledge packs for frameworks and threats
- Local-first, works fully offline
- JSON project files (.aitm)
- Export findings and reports

## Getting Started

```bash
git clone <repo>
cd ai-threat-modeler
npm install
npm run dev
```

## Sample Projects

The [`samples/`](samples/) directory contains ready-to-open `.aitm` projects that demonstrate common AI architectures and the kinds of findings AI Threat Modeler produces. They are the fastest way to try the tool without building a model from scratch — just launch the app, choose **Open Project**, and pick one.

| Sample | What it shows |
| --- | --- |
| [`rag-chatbot-public.aitm`](samples/rag-chatbot-public.aitm) | Public-facing RAG chatbot — common AI application attack surfaces (prompt injection, data exfiltration, hallucination handling). |
| [`internal-ai-agent.aitm`](samples/internal-ai-agent.aitm) | Internal enterprise agent with tool access (DB queries, API calls, email) — agent autonomy and over-privileged tool risks. |
| [`multi-provider-sensitive-data.aitm`](samples/multi-provider-sensitive-data.aitm) | Enterprise RAG handling regulated financial data across multiple model providers — data residency, multi-tenant, and provider trust risks. |
| [`ml-training-pipeline.aitm`](samples/ml-training-pipeline.aitm) | Model fine-tuning workflow — training data integrity and supply chain risks. |
| [`minimal-safe-architecture.aitm`](samples/minimal-safe-architecture.aitm) | A hardened reference architecture with recommended controls in place — useful as a contrast to the other samples. |

After opening a sample, click **Analyze** in the toolbar to run the rules engine and see findings mapped to MITRE ATLAS, OWASP LLM Top 10, NIST AI RMF, and NIST CSF.

## Technology

Built with Electron, React, TypeScript, React Flow, Zustand, Zod, and Tailwind CSS.

## Architecture

The application is organized into four subsystems:

- **Modeling Engine** -- Canvas, node library, and project persistence
- **Knowledge Engine** -- Knowledge packs, framework mappings, and lookup
- **Analysis Engine** -- Rules, evaluator, and findings
- **Reporting Layer** -- Findings view and export

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full architecture document.

## Contributing

Contributions are welcome. Knowledge packs and analysis rules are the easiest way to contribute since they are declarative JSON and require no changes to application code.

See [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) for the contributor guide.

## Knowledge Packs

AI Threat Modeler uses structured JSON knowledge packs to define threats, controls, mitigations, and analysis rules. Packs can reference external frameworks like MITRE ATLAS and OWASP LLM Top 10. You can extend the built-in packs or create new ones for additional frameworks.

See [docs/KNOWLEDGE-PACKS.md](docs/KNOWLEDGE-PACKS.md) for the full guide.

## Support the Project

If you find AI Threat Modeler useful in your work, consider supporting its continued development:

- [GitHub Sponsors](https://github.com/sponsors/nshalabi)

Your support helps keep the project maintained and free for the community.

---

## License

Source-available under a custom license.

- **Personal Use** (private, educational, research, evaluation by an
  individual): free, no approval required.
- **Internal Enterprise Use** (any use by or on behalf of an organization,
  including its employees and contractors): requires prior written permission
  from the author. A limited 30-day evaluation right is available — see the
  LICENSE file.
- **Commercial Use** and **Distribution** (forks, mirrors, repackaging,
  bundling): require prior written permission from the author.

See [LICENSE](LICENSE) for the full terms.

Copyright &copy; 2026 Nader Shalabi.

## Acknowledgments

This project references content and taxonomy from the following frameworks:

- [MITRE ATLAS](https://atlas.mitre.org/) -- Adversarial Threat Landscape for AI Systems
- [OWASP](https://owasp.org/) -- LLM Top 10 and GenAI guidance
- [NIST AI RMF](https://www.nist.gov/artificial-intelligence/ai-risk-management-framework) -- AI Risk Management Framework
- [NIST CSF](https://www.nist.gov/cyberframework) -- Cybersecurity Framework
