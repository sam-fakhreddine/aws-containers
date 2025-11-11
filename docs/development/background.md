# Project Background

## Origin Story

### The Problem

Like many AWS power users, we accumulated a collection of local custom scripts and Firefox extensions to manage multiple AWS accounts and profiles. These tools evolved organically over time:

- CLI-based scripts for credential management
- Custom Firefox extensions for browser automation
- Shell aliases and helper functions
- Various one-off utilities

While functional, this mishmash of tooling had significant drawbacks:

- **Fragmented workflow**: Switching between CLI and browser required context switching
- **Inconsistent UX**: Each tool had its own interface and patterns
- **Maintenance burden**: Multiple codebases to maintain and update
- **Limited integration**: Tools didn't communicate well with each other
- **Steep learning curve**: New team members had to learn many different tools

### Discovery of Granted

We discovered [granted.dev](https://granted.dev), an excellent tool for managing AWS credentials and profiles. While granted provided many features we needed, we found that it didn't quite fit our specific workflow requirements:

- We needed deeper integration with Firefox containers
- Our team heavily relied on AWS Console federation
- We had specific needs around credential expiration monitoring
- We wanted SSO profile support with our existing tooling patterns

### The Solution

Rather than starting from scratch, we:

1. **Forked granted.dev** as our foundation - it provided excellent credential management patterns
2. **Used it as inspiration** for architecture and design decisions
3. **Brought our existing tooling together** into a unified browser extension
4. **Added our specific requirements** like container management, federation, and SSO support

The result is AWS Profile Containers - a specialized tool that combines the best aspects of our custom scripts with the solid foundation provided by granted, all wrapped in a cohesive Firefox extension.

## Design Philosophy

The project reflects several key principles from its origin:

### CLI-First Mentality

Our background in CLI tools influences the design:

- **Native messaging bridge** allows filesystem access (like CLI tools)
- **Keyboard-friendly UI** with search and quick access
- **Scriptable patterns** that power users expect
- **No-nonsense approach** focused on efficiency

### Firefox Containers

Firefox's container feature was central to our original scripts:

- **Complete isolation** between AWS accounts
- **Visual distinction** with colors and icons
- **Native browser integration** (no custom protocols)
- **Security-focused** credential handling

### Federation-First

AWS Console federation was a core feature of our custom scripts:

- **Automatic URL generation** removes manual steps
- **Temporary tokens** improve security
- **No credential storage** in the browser
- **Works with SSO** and temporary credentials

### Open Source Ethos

Following granted's example:

- **MIT License** for maximum flexibility
- **Transparent security** with documented data flows
- **Community-driven** development
- **Extensible architecture** for customization

## Acknowledgments

### Granted

This project was inspired by and built upon concepts from [granted.dev](https://granted.dev). We're grateful to the granted team for:

- Pioneering excellent AWS credential management patterns
- Providing a solid architectural foundation
- Being open source and allowing derivative works
- Demonstrating best practices in security and UX

While our implementation diverged significantly to meet specific needs, granted's influence is evident throughout the codebase.

### Our Custom Scripts

The project also incorporates lessons learned from years of internal tooling:

- Credential expiration monitoring patterns
- Container color coding schemes
- SSO integration approaches
- Federation workflow optimizations

## Evolution

The project continues to evolve:

- **Version 1.0**: Basic credential reading and container opening
- **Version 2.0**: Added SSO support and federation
- **Version 3.0**: Standalone executables (no Python required)
- **Current**: Comprehensive documentation and testing
- **Future**: Additional cloud providers, enhanced automation

## Related Projects

- [granted.dev](https://granted.dev) - AWS credential management CLI
- [aws-vault](https://github.com/99designs/aws-vault) - AWS credential storage
- [aws-sso-util](https://github.com/benkehoe/aws-sso-util) - AWS SSO tools
- [leapp](https://www.leapp.cloud/) - Cloud access manager

## Contributing

If our origin story resonates with you, we welcome contributions. See [Contributing Guide](contributing.md) for details.
