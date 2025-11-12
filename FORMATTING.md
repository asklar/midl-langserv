# MIDL3 Document Formatting

This document describes the document formatting feature added to the MIDL3 language server.

## Overview

The MIDL3 language server now includes a document formatter, similar to `clang-format` for C++. This feature automatically formats MIDL 3.0 code according to consistent style rules.

## Features

- **Automatic indentation**: Properly indents code blocks based on braces
- **Configurable indentation**: Respects VSCode settings for tabs vs spaces and tab size
- **Spacing normalization**: Ensures consistent spacing around:
  - Keywords (`namespace`, `runtimeclass`, `interface`, etc.)
  - Operators (`:`, `,`)
  - Braces and property accessors (`{ get; set; }`)
- **Comment preservation**: Maintains single-line (`//`) and block (`/* */`) comments
- **Attribute formatting**: Properly formats attribute blocks (`[...]`)

## Usage

### Format Entire Document

- **Windows/Linux**: Press `Shift+Alt+F`
- **macOS**: Press `Shift+Option+F`
- **Command Palette**: Run "Format Document"

### Format Selection

1. Select the code you want to format
2. **Windows/Linux**: Press `Ctrl+K Ctrl+F`
3. **macOS**: Press `Cmd+K Cmd+F`
4. **Command Palette**: Run "Format Selection"

### Configuration

The formatter respects your VSCode editor settings:

```json
{
  "editor.tabSize": 4,           // Number of spaces per indentation level
  "editor.insertSpaces": true,   // Use spaces instead of tabs
  "editor.formatOnSave": true    // Automatically format on save (optional)
}
```

## Example

### Before Formatting

```midl
namespace   WindowsDemo
{
[contract(DemoContract, 1.0)]
interface   IDemoInterface
{
void   DoWork();
String GetData(Int32   value);
}

runtimeclass   DemoControl:IDemoInterface
{
DemoControl();
String   Title{get;set;};
Int32 Value{get;};
}
}
```

### After Formatting

```midl
namespace WindowsDemo
{
    [contract(DemoContract, 1.0)]
    interface IDemoInterface
    {
        void   DoWork();
        String GetData(Int32   value);
    }

    runtimeclass DemoControl : IDemoInterface
    {
        DemoControl();
        String   Title{ get; set; };
        Int32 Value{ get; };
    }
}
```

## Formatting Rules

### Indentation

- Each level of nesting increases indentation by one level
- Opening braces `{` increase indent for following lines
- Closing braces `}` decrease indent for the current line

### Spacing

- **Keywords**: Single space after keywords (`namespace Name`, not `namespace  Name`)
- **Inheritance**: Space around colon (`: Interface`, not `:Interface`)
- **Commas**: Space after commas (`, `, not `,`)
- **Property accessors**: Space around braces and semicolons (`{ get; set; }`, not `{get;set;}`)
- **Braces**: Space before opening brace on same line (`Name {`, not `Name{`)

### Comments

- Comments are preserved with their content unchanged
- Comments are indented to match the surrounding code
- Both single-line (`//`) and multi-line (`/* */`) comments are supported

### Attributes

- Attribute blocks `[...]` are preserved and indented
- Multiple attributes on separate lines are supported
- Attribute content is not modified

## Implementation

The formatter is implemented in `server/src/formatter.ts` and integrates with the Language Server Protocol's document formatting capabilities:

- `documentFormattingProvider`: Formats entire document
- `documentRangeFormattingProvider`: Formats selected range

## Testing

The formatter includes comprehensive unit tests in `server/src/test/formatter.test.ts` covering:

- Basic namespace and class formatting
- Property accessor normalization
- Comment preservation
- Attribute formatting
- Configurable indentation (tabs vs spaces)
- Keyword spacing normalization

All tests pass and validate the formatter's behavior.
