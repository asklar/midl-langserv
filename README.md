# MIDL 3.0 language support

Provides syntax highlighting, autocomplete, and diagnostics for [MIDL 3](https://docs.microsoft.com/uwp/midl-3/intro).

**Status:** Development in progress.

## Functionality

- [x] Syntax highlighting
- [x] Basic semantic parsing
- [x] Prototype squigglies and auto-completions
- [ ] Better at recovery from a parse error, better at identifying non-compiling code (error handling).
- [ ] C Pre-processor
- [ ] move parser to server
- [ ] define system types like Windows.Foundation.IInspectable, etc.
- [ ] define type aliases for the well known types
- [ ] support for generic types like IVector<T>
- [ ] XDC / intellisense XML doc tooltips
- [ ] Unit tests for the parser
- [ ] e2e tests for autocompletion, diagnostics


This extension collects basic usage telemetry (e.g. which version is being used).
## Feedback / bug reports

https://github.com/asklar/midl_langserv