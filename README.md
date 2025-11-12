[![CI](https://github.com/asklar/midl_langserv/actions/workflows/main.yml/badge.svg)](https://github.com/asklar/midl_langserv/actions/workflows/main.yml)

# MIDL 3.0 language support

Provides syntax highlighting, autocomplete, and diagnostics for [MIDL 3](https://docs.microsoft.com/uwp/midl-3/intro).

**Status:** Development in progress.

## Functionality

- [x] Syntax highlighting
- [x] Basic semantic parsing
- [x] Diagnostics ("squigglies") and context-free auto-completions
- [x] Document formatting (similar to clang-format)
  - Format entire document or selection
  - Configurable indentation (tabs or spaces)
  - Normalizes spacing around keywords, operators, and braces
  - Preserves comments

This extension collects basic usage telemetry (e.g. which version is being used).

## Usage

### Formatting

To format a MIDL 3.0 file:
- **Format entire document**: Press `Shift+Alt+F` (Windows/Linux) or `Shift+Option+F` (Mac)
- **Format selection**: Select code and press `Ctrl+K Ctrl+F` (Windows/Linux) or `Cmd+K Cmd+F` (Mac)

The formatter respects your VSCode settings for indentation (`editor.tabSize` and `editor.insertSpaces`).

## Feedback / bug reports

https://github.com/asklar/midl-langserv
