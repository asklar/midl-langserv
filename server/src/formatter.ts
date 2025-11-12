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
  
  // Parse the text character by character to build properly formatted output
  const result: string[] = [];
  let indentLevel = 0;
  let currentLine: string[] = [];
  let i = 0;
  
  enum State {
    Normal,
    InLineComment,
    InBlockComment,
    InString,
    InPreprocessor,
    InPropertyAccessor
  }
  
  let state = State.Normal;
  let lastNonWhitespace = '';
  
  while (i < text.length) {
    const ch = text[i];
    const next = i + 1 < text.length ? text[i + 1] : '';
    const peek = (offset: number) => i + offset < text.length ? text[i + offset] : '';
    
    // Handle line comments
    if (state === State.Normal && ch === '/' && next === '/') {
      state = State.InLineComment;
      currentLine.push(ch);
      i++;
      continue;
    }
    
    if (state === State.InLineComment) {
      currentLine.push(ch);
      if (ch === '\n') {
        result.push(indent.repeat(indentLevel) + currentLine.join('').trim());
        currentLine = [];
        state = State.Normal;
      }
      i++;
      continue;
    }
    
    // Handle block comments
    if (state === State.Normal && ch === '/' && next === '*') {
      state = State.InBlockComment;
      currentLine.push(ch);
      i++;
      continue;
    }
    
    if (state === State.InBlockComment) {
      currentLine.push(ch);
      if (ch === '*' && next === '/') {
        currentLine.push(next);
        i += 2;
        state = State.Normal;
        continue;
      }
      if (ch === '\n') {
        result.push(indent.repeat(indentLevel) + currentLine.join('').trim());
        currentLine = [];
      }
      i++;
      continue;
    }
    
    // Handle preprocessor directives
    if (state === State.Normal && ch === '#' && (currentLine.length === 0 || currentLine.join('').trim() === '')) {
      state = State.InPreprocessor;
      currentLine = ['#'];
      i++;
      continue;
    }
    
    if (state === State.InPreprocessor) {
      currentLine.push(ch);
      if (ch === '\n') {
        result.push(currentLine.join('').trim());
        currentLine = [];
        state = State.Normal;
      }
      i++;
      continue;
    }
    
    // Handle strings (for future robustness)
    if (state === State.Normal && ch === '"') {
      state = State.InString;
      currentLine.push(ch);
      i++;
      continue;
    }
    
    if (state === State.InString) {
      currentLine.push(ch);
      if (ch === '"' && text[i - 1] !== '\\') {
        state = State.Normal;
      }
      i++;
      continue;
    }
    
    // Detect property accessors { get; set; }
    if (state === State.Normal && ch === '{') {
      // Look ahead to see if this is a property accessor
      let j = i + 1;
      let ahead = '';
      while (j < text.length && j < i + 50) {
        if (text[j] === '}') break;
        ahead += text[j];
        j++;
      }
      if (/^\s*(get|set)\s*;\s*(get|set)?\s*;?\s*$/.test(ahead)) {
        // This is a property accessor, keep it together
        // Save what we have before the accessor
        const beforeAccessor = currentLine.join('');
        state = State.InPropertyAccessor;
        currentLine = [beforeAccessor, ch];
        i++;
        continue;
      }
    }
    
    if (state === State.InPropertyAccessor) {
      currentLine.push(ch);
      if (ch === '}') {
        state = State.Normal;
        // Normalize the accessor part only
        const fullLine = currentLine.join('');
        // Match: everything before { ... get/set ... } ... everything after
        const match = fullLine.match(/(.*?)({\s*(get|set)\s*;\s*(get|set)?\s*;?\s*})(.*)/);
        if (match) {
          const before = match[1].trim();
          const accessor = match[2];
          const after = match[5] || '';  // match[5] is everything after }, match[3] and match[4] are the get/set inside
          // Normalize: ensure single space after opening brace, before closing brace, and after semicolons
          const normalized = accessor
            .replace(/\s+/g, ' ')           // collapse multiple spaces
            .replace(/{\s*/g, '{ ')         // space after {
            .replace(/\s*}/g, ' }')         // space before }
            .replace(/;\s*/g, '; ');        // space after semicolons
          currentLine = [(before + normalized + after).trim()];
        }
      }
      i++;
      continue;
    }
    
    // Normal state processing
    if (ch === '\n') {
      const line = currentLine.join('').trim();
      if (line.length > 0) {
        result.push(indent.repeat(indentLevel) + line);
      } else {
        result.push('');
      }
      currentLine = [];
      i++;
      continue;
    }
    
    // Handle opening braces
    if (ch === '{') {
      const line = currentLine.join('').trim();
      if (line.length > 0) {
        if (braceStyle === 'newLine') {
          result.push(indent.repeat(indentLevel) + line);
          result.push(indent.repeat(indentLevel) + '{');
        } else {
          result.push(indent.repeat(indentLevel) + line + ' {');
        }
      } else {
        result.push(indent.repeat(indentLevel) + '{');
      }
      currentLine = [];
      indentLevel++;
      lastNonWhitespace = '{';
      i++;
      continue;
    }
    
    // Handle closing braces
    if (ch === '}') {
      const line = currentLine.join('').trim();
      indentLevel = Math.max(0, indentLevel - 1);
      if (line.length > 0) {
        result.push(indent.repeat(indentLevel + 1) + line);
      }
      result.push(indent.repeat(indentLevel) + '}');
      currentLine = [];
      lastNonWhitespace = '}';
      i++;
      continue;
    }
    
    // Handle semicolons - end of statement
    if (ch === ';') {
      currentLine.push(ch);
      const line = currentLine.join('').trim();
      if (line.length > 0) {
        result.push(indent.repeat(indentLevel) + line);
      }
      currentLine = [];
      i++;
      continue;
    }
    
    // Regular characters
    if (ch === ' ' || ch === '\t') {
      // Normalize whitespace - only add space if we have content
      if (currentLine.length > 0 && currentLine[currentLine.length - 1] !== ' ') {
        currentLine.push(' ');
      }
    } else {
      currentLine.push(ch);
      if (ch !== ' ' && ch !== '\t') {
        lastNonWhitespace = ch;
      }
    }
    
    i++;
  }
  
  // Handle any remaining content
  const line = currentLine.join('').trim();
  if (line.length > 0) {
    result.push(indent.repeat(indentLevel) + line);
  }
  
  // Post-process: normalize spacing and remove extra blank lines
  const normalizedResult: string[] = [];
  
  for (let i = 0; i < result.length; i++) {
    let line = result[i];
    
    // Skip all blank lines for now (we'll add them strategically if needed later)
    if (line.trim() === '') {
      continue;
    }
    
    // For sameLine brace style, merge opening braces with previous line
    if (braceStyle === 'sameLine' && line.trim() === '{' && normalizedResult.length > 0) {
      const lastIdx = normalizedResult.length - 1;
      normalizedResult[lastIdx] = normalizedResult[lastIdx] + ' {';
      continue;
    }
    
    // Normalize spacing in the line
    line = normalizeLineSpacing(line);
    normalizedResult.push(line);
  }
  
  // Join lines and ensure file ends with newline
  let formatted = normalizedResult.join('\n');
  if (!formatted.endsWith('\n') && text.length > 0) {
    formatted += '\n';
  }
  
  return formatted;
}

/**
 * Normalize spacing within a line
 */
function normalizeLineSpacing(line: string): string {
  // Find the indentation
  const match = line.match(/^(\s*)(.*)/);
  if (!match) return line;
  
  const indentation = match[1];
  let content = match[2];
  
  // Don't normalize if it's a comment or preprocessor directive
  if (content.startsWith('//') || content.startsWith('/*') || content.startsWith('#')) {
    return line;
  }
  
  // Normalize spacing around colons (for inheritance)
  content = content.replace(/\s*:\s*/g, ' : ');
  
  // Normalize spacing around commas
  content = content.replace(/\s*,\s*/g, ', ');
  
  // Normalize multiple spaces to single space (but preserve property accessors)
  // First protect property accessors
  const propertyAccessors: string[] = [];
  content = content.replace(/{\s*(get|set)\s*;\s*(?:(get|set)\s*;)?\s*}/g, (match) => {
    propertyAccessors.push(match);
    return `__ACCESSOR_${propertyAccessors.length - 1}__`;
  });
  
  // Now normalize spaces
  content = content.replace(/\s{2,}/g, ' ');
  
  // Restore property accessors
  content = content.replace(/__ACCESSOR_(\d+)__/g, (match, index) => {
    return propertyAccessors[index];
  });
  
  return indentation + content;
}
