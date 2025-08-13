# Automatic Code Commenting Tool - Task List

## Core Functionality
- [ ] Extend extractor modules to support function/class/method signature extraction for each language
- [ ] Implement comment generators for each language (template per language)
- [ ] Integrate LLM/AI for summary and parameter description generation

## Comment Insertion Logic
- [ ] Detect and skip/update existing comments as per user config
- [ ] Insert generated comments above function/class definitions

## CLI Tool
- [ ] Build CLI command: `add-comments [options]`
- [ ] Add options: `--overwrite`, `--languages=`, `--dry-run`, `--interactive`

## User Experience
- [ ] (Optional) Interactive review/edit before applying changes
- [ ] (Optional) Run as part of documentation workflow

## Testing & Extensibility
- [ ] Test on multi-language codebases
- [ ] Document how to add new comment styles/languages
