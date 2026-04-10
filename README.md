# Sonny

**Desktop application for AI system threat modeling and attack surface analysis**

[![Sponsor](https://img.shields.io/badge/Sponsor-%E2%9D%A4-pink?logo=github)](https://github.com/sponsors/nshalabi)

Sonny is a visual threat modeling tool specialized for AI systems, LLM applications, RAG architectures, agents, and model pipelines. It allows security professionals to model AI systems with components, trust boundaries, and data flows, then run automated analysis to identify threats, weaknesses, and recommended mitigations. Findings map to established frameworks including MITRE ATLAS, OWASP LLM/GenAI guidance, NIST AI RMF, and NIST CSF. The tool is fully local and offline with no cloud dependency.

<!-- Screenshot coming soon -->

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

Sonny uses structured JSON knowledge packs to define threats, controls, mitigations, and analysis rules. Packs can reference external frameworks like MITRE ATLAS and OWASP LLM Top 10. You can extend the built-in packs or create new ones for additional frameworks.

See [docs/KNOWLEDGE-PACKS.md](docs/KNOWLEDGE-PACKS.md) for the full guide.

## Support the Project

If you find Sonny useful in your work, consider supporting its continued development:

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
