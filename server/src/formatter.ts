/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import { TextDocument } from 'vscode-languageserver-textdocument';
import { TextEdit, Range, Position, FormattingOptions } from 'vscode-languageserver/node';

/**
 * Format a MIDL3 document
 * @param document The document to format
 * @param options Formatting options (tabSize, insertSpaces, etc.)
 * @param braceStyle Brace placement style ('newLine' or 'sameLine')
 * @returns Array of text edits to apply
 */
export function formatDocument(
  document: TextDocument, 
  options: FormattingOptions,
  braceStyle: 'newLine' | 'sameLine' = 'newLine'
): TextEdit[] {
  const text = document.getText();
  const formatted = formatMidlText(text, options, braceStyle);
  
  // If no changes, return empty array
  if (text === formatted) {
    return [];
  }
  
  // Return a single edit that replaces the entire document
  const lastLine = document.lineCount - 1;
  const lastChar = document.getText({
    start: { line: lastLine, character: 0 },
    end: { line: lastLine + 1, character: 0 }
  }).length;
  
  return [
    TextEdit.replace(
      Range.create(
        Position.create(0, 0),
        Position.create(lastLine, lastChar)
      ),
      formatted
    )
  ];
}

/**
 * Format a range within a MIDL3 document
 * @param document The document to format
 * @param range The range to format
 * @param options Formatting options
 * @param braceStyle Brace placement style ('newLine' or 'sameLine')
 * @returns Array of text edits to apply
 */
export function formatDocumentRange(
  document: TextDocument,
  range: Range,
  options: FormattingOptions,
  braceStyle: 'newLine' | 'sameLine' = 'newLine'
): TextEdit[] {
  const text = document.getText(range);
  const formatted = formatMidlText(text, options, braceStyle);
  
  if (text === formatted) {
    return [];
  }
  
  return [TextEdit.replace(range, formatted)];
}

/**
 * Core formatting logic for MIDL3 text
 */
function formatMidlText(text: string, options: FormattingOptions, braceStyle: 'newLine' | 'sameLine'): string {
  const indent = options.insertSpaces ? ' '.repeat(options.tabSize) : '\t';
  const lines = text.split('\n');
  const formattedLines: string[] = [];
  
  let indentLevel = 0;
  let inBlockComment = false;
  let inAttributeBlock = false;
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    const trimmed = line.trim();
    
    // Skip empty lines (preserve them but normalize whitespace)
    if (trimmed === '') {
      formattedLines.push('');
      continue;
    }
    
    // Handle C preprocessor directives - preserve at column 0
    if (trimmed.startsWith('#')) {
      formattedLines.push(trimmed);
      continue;
    }
    
    // Handle block comments
    if (trimmed.startsWith('/*')) {
      inBlockComment = true;
    }
    if (inBlockComment) {
      formattedLines.push(indent.repeat(indentLevel) + trimmed);
      if (trimmed.endsWith('*/')) {
        inBlockComment = false;
      }
      continue;
    }
    
    // Handle single-line comments
    if (trimmed.startsWith('//')) {
      formattedLines.push(indent.repeat(indentLevel) + trimmed);
      continue;
    }
    
    // Handle attribute blocks [...]
    if (trimmed.startsWith('[')) {
      inAttributeBlock = true;
      formattedLines.push(indent.repeat(indentLevel) + trimmed);
      if (trimmed.endsWith(']') || trimmed.includes(']')) {
        inAttributeBlock = false;
      }
      continue;
    }
    
    if (inAttributeBlock) {
      formattedLines.push(indent.repeat(indentLevel) + trimmed);
      if (trimmed.endsWith(']') || trimmed.includes(']')) {
        inAttributeBlock = false;
      }
      continue;
    }
    
    // Decrease indent for closing braces
    if (trimmed.startsWith('}')) {
      indentLevel = Math.max(0, indentLevel - 1);
    }
    
    // Handle brace placement style
    if (braceStyle === 'newLine' && trimmed.endsWith('{') && !trimmed.startsWith('{')) {
      // Split line at the brace if it's not already on its own line
      const contentBeforeBrace = trimmed.substring(0, trimmed.length - 1).trim();
      if (contentBeforeBrace.length > 0) {
        // Add the content without the brace
        let formattedLine = indent.repeat(indentLevel) + contentBeforeBrace;
        formattedLine = normalizeSpacing(formattedLine, indent.repeat(indentLevel), braceStyle);
        formattedLines.push(formattedLine);
        // Add the brace on its own line
        formattedLines.push(indent.repeat(indentLevel) + '{');
        indentLevel++;
        continue;
      }
    } else if (braceStyle === 'sameLine' && trimmed === '{') {
      // For sameLine style, merge standalone opening brace with previous line
      if (formattedLines.length > 0) {
        const lastLineIndex = formattedLines.length - 1;
        formattedLines[lastLineIndex] += ' {';
        indentLevel++;
        continue;
      }
    }
    
    // Format the line with proper indentation
    let formattedLine = indent.repeat(indentLevel) + trimmed;
    
    // Normalize spacing around common patterns
    formattedLine = normalizeSpacing(formattedLine, indent.repeat(indentLevel), braceStyle);
    
    formattedLines.push(formattedLine);
    
    // Increase indent for opening braces
    if (trimmed.endsWith('{')) {
      indentLevel++;
    }
    
    // Handle closing brace on same line (shouldn't normally happen in MIDL3)
    if (trimmed.includes('{') && trimmed.includes('}')) {
      // Reset indent if both braces are on same line
      const openCount = (trimmed.match(/{/g) || []).length;
      const closeCount = (trimmed.match(/}/g) || []).length;
      indentLevel += openCount - closeCount;
    }
  }
  
  // Join lines and ensure file ends with newline
  let result = formattedLines.join('\n');
  if (!result.endsWith('\n') && text.length > 0) {
    result += '\n';
  }
  
  return result;
}

/**
 * Normalize spacing in a line
 */
function normalizeSpacing(line: string, indentPrefix: string, braceStyle: 'newLine' | 'sameLine'): string {
  // Remove indent prefix temporarily for processing
  let content = line.substring(indentPrefix.length);
  
  // Normalize spacing after any identifier followed by whitespace and another token
  // This handles all keywords generically without hardcoding them
  content = content.replace(/\b(\w+)\s{2,}/g, '$1 ');
  
  // Normalize spacing around colons in inheritance
  content = content.replace(/\s*:\s*/g, ' : ');
  
  // Normalize spacing around commas
  content = content.replace(/\s*,\s*/g, ', ');
  
  // Normalize spacing in property accessors { get; set; }
  content = content.replace(/{\s*get\s*;\s*set\s*;\s*}/g, '{ get; set; }');
  content = content.replace(/{\s*get\s*;\s*}/g, '{ get; }');
  content = content.replace(/{\s*set\s*;\s*}/g, '{ set; }');
  
  // Normalize spacing around opening braces based on style
  if (braceStyle === 'sameLine') {
    // Only add space if there's text before the brace (not a standalone brace)
    content = content.replace(/(\S)\s*{\s*$/g, '$1 {');
  }
  // For newLine style, braces are already on their own line from formatMidlText
  
  // Normalize spacing around parentheses in method declarations
  content = content.replace(/\(\s+/g, '(');
  content = content.replace(/\s+\)/g, ')');
  
  // Ensure space after semicolons in parameter lists
  content = content.replace(/;(?=[^\s}])/g, '; ');
  
  return indentPrefix + content;
}
