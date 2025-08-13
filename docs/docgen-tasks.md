# Multi-Language Documentation Generation - Task List

## Core Infrastructure
- [ ] Design agent and tool interfaces for extensibility
- [ ] Implement file discovery (recursive, language-agnostic)
- [ ] Implement language detection per file

## Language Support
- [ ] Create extractor modules for:
  - [ ] JavaScript/TypeScript
  - [ ] Python
  - [ ] Java
  - [ ] C#
  - [ ] C/C++
  - [ ] React (JSX/TSX)
  - [ ] Others as needed

## Code Analysis
- [ ] Parse code to extract:
  - [ ] Functions, classes, methods, properties
  - [ ] Comments/docstrings
  - [ ] Module/package/file-level metadata

## Documentation Generation
- [ ] Aggregate extracted data into a documentation model
- [ ] Implement markdown generator (per-file and/or combined)
- [ ] Support technical and user-oriented documentation templates
- [ ] (Optional) Generate architecture diagrams (e.g., mermaid)

## User Experience
- [ ] Build CLI command for doc generation
- [ ] Add options for output location, doc type, and review/edit
- [ ] (Optional) Integrate LLM/AI for summaries and high-level docs

## Testing & Extensibility
- [ ] Test on mixed-language repos
- [ ] Document how to add new language support
