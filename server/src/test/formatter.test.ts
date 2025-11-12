/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as assert from 'assert';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { formatDocument } from '../formatter';

describe('Formatter tests', () => {
  it('should format with newLine brace style and 4 spaces (default)', () => {
    const input = `namespace DemoNamespace{
runtimeclass DemoClass{
DemoClass();
}
}`;

    const expected = `namespace DemoNamespace
{
    runtimeclass DemoClass
    {
        DemoClass();
    }
}
`;

    const doc = TextDocument.create('test://test.idl', 'midl3', 1, input);
    const edits = formatDocument(doc, { tabSize: 4, insertSpaces: true }, 'newLine');
    
    assert.strictEqual(edits.length, 1);
    assert.strictEqual(edits[0].newText, expected);
  });

  it('should format with sameLine brace style', () => {
    const input = `namespace DemoNamespace
{
runtimeclass DemoClass
{
DemoClass();
}
}`;

    const expected = `namespace DemoNamespace {
\truntimeclass DemoClass {
\t\tDemoClass();
\t}
}
`;

    const doc = TextDocument.create('test://test.idl', 'midl3', 1, input);
    const edits = formatDocument(doc, { tabSize: 1, insertSpaces: false }, 'sameLine');
    
    assert.strictEqual(edits.length, 1);
    assert.strictEqual(edits[0].newText, expected);
  });

  it('should format properties with accessors', () => {
    const input = `namespace DemoNamespace
{
    runtimeclass DemoClass
    {
        Int32 DemoProperty{get;set;};
    }
}`;

    const expected = `namespace DemoNamespace
{
    runtimeclass DemoClass
    {
        Int32 DemoProperty{ get; set; };
    }
}
`;

    const doc = TextDocument.create('test://test.idl', 'midl3', 1, input);
    const edits = formatDocument(doc, { tabSize: 4, insertSpaces: true }, 'newLine');
    
    assert.strictEqual(edits.length, 1);
    assert.strictEqual(edits[0].newText, expected);
  });

  it('should preserve comments', () => {
    const input = `namespace DemoNamespace
{
// This is a comment
runtimeclass DemoClass
{
/* Block comment */
DemoClass();
}
}`;

    const expected = `namespace DemoNamespace
{
    // This is a comment
    runtimeclass DemoClass
    {
        /* Block comment */
        DemoClass();
    }
}
`;

    const doc = TextDocument.create('test://test.idl', 'midl3', 1, input);
    const edits = formatDocument(doc, { tabSize: 4, insertSpaces: true }, 'newLine');
    
    assert.strictEqual(edits.length, 1);
    assert.strictEqual(edits[0].newText, expected);
  });

  it('should format attributes', () => {
    const input = `[DEMO_NAMESPACE]
namespace DemoNamespace
{
[PREVIEW_API]
runtimeclass DemoClass
{
DemoClass();
}
}`;

    const expected = `[DEMO_NAMESPACE]
namespace DemoNamespace
{
    [PREVIEW_API]
    runtimeclass DemoClass
    {
        DemoClass();
    }
}
`;

    const doc = TextDocument.create('test://test.idl', 'midl3', 1, input);
    const edits = formatDocument(doc, { tabSize: 4, insertSpaces: true }, 'newLine');
    
    assert.strictEqual(edits.length, 1);
    assert.strictEqual(edits[0].newText, expected);
  });

  it('should handle C preprocessor directives', () => {
    const input = `#ifdef DEMO_FEATURE
namespace DemoNamespace
{
#define MAX_COUNT 100
runtimeclass DemoClass
{
DemoClass();
}
}
#endif`;

    const expected = `#ifdef DEMO_FEATURE
namespace DemoNamespace
{
#define MAX_COUNT 100
    runtimeclass DemoClass
    {
        DemoClass();
    }
}
#endif
`;

    const doc = TextDocument.create('test://test.idl', 'midl3', 1, input);
    const edits = formatDocument(doc, { tabSize: 4, insertSpaces: true }, 'newLine');
    
    assert.strictEqual(edits.length, 1);
    assert.strictEqual(edits[0].newText, expected);
  });

  it('should normalize spacing generically', () => {
    const input = `namespace  DemoNamespace
{
runtimeclass   DemoClass:IDemoInterface
{
DemoClass();
}
}`;

    const expected = `namespace DemoNamespace
{
    runtimeclass DemoClass : IDemoInterface
    {
        DemoClass();
    }
}
`;

    const doc = TextDocument.create('test://test.idl', 'midl3', 1, input);
    const edits = formatDocument(doc, { tabSize: 4, insertSpaces: true }, 'newLine');
    
    assert.strictEqual(edits.length, 1);
    assert.strictEqual(edits[0].newText, expected);
  });

  it('should return empty array when no changes needed', () => {
    const input = `namespace DemoNamespace
{
    runtimeclass DemoClass
    {
        DemoClass();
    }
}
`;

    const doc = TextDocument.create('test://test.idl', 'midl3', 1, input);
    const edits = formatDocument(doc, { tabSize: 4, insertSpaces: true }, 'newLine');
    
    assert.strictEqual(edits.length, 0);
  });
});
