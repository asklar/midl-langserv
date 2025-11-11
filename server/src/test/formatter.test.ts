/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as assert from 'assert';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { formatDocument } from '../formatter';

describe('Formatter tests', () => {
  it('should format a simple namespace', () => {
    const input = `namespace DemoNamespace
{
runtimeclass DemoClass
{
DemoClass();
}
}`;

    const expected = `namespace DemoNamespace
{
\truntimeclass DemoClass
\t{
\t\tDemoClass();
\t}
}
`;

    const doc = TextDocument.create('test://test.idl', 'midl3', 1, input);
    const edits = formatDocument(doc, { tabSize: 1, insertSpaces: false });
    
    assert.strictEqual(edits.length, 1);
    assert.strictEqual(edits[0].newText, expected);
  });

  it('should format properties with accessors', () => {
    const input = `namespace DemoNamespace
{
\truntimeclass DemoClass
\t{
\t\tInt32 DemoProperty{get;set;};
\t}
}`;

    const expected = `namespace DemoNamespace
{
\truntimeclass DemoClass
\t{
\t\tInt32 DemoProperty{ get; set; };
\t}
}
`;

    const doc = TextDocument.create('test://test.idl', 'midl3', 1, input);
    const edits = formatDocument(doc, { tabSize: 1, insertSpaces: false });
    
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
\t// This is a comment
\truntimeclass DemoClass
\t{
\t\t/* Block comment */
\t\tDemoClass();
\t}
}
`;

    const doc = TextDocument.create('test://test.idl', 'midl3', 1, input);
    const edits = formatDocument(doc, { tabSize: 1, insertSpaces: false });
    
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
\t[PREVIEW_API]
\truntimeclass DemoClass
\t{
\t\tDemoClass();
\t}
}
`;

    const doc = TextDocument.create('test://test.idl', 'midl3', 1, input);
    const edits = formatDocument(doc, { tabSize: 1, insertSpaces: false });
    
    assert.strictEqual(edits.length, 1);
    assert.strictEqual(edits[0].newText, expected);
  });

  it('should format with spaces instead of tabs', () => {
    const input = `namespace DemoNamespace
{
runtimeclass DemoClass
{
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
    const edits = formatDocument(doc, { tabSize: 2, insertSpaces: true });
    
    assert.strictEqual(edits.length, 1);
    assert.strictEqual(edits[0].newText, expected);
  });

  it('should normalize spacing around keywords', () => {
    const input = `namespace  DemoNamespace
{
runtimeclass   DemoClass:IDemoInterface
{
DemoClass();
}
}`;

    const expected = `namespace DemoNamespace
{
\truntimeclass DemoClass : IDemoInterface
\t{
\t\tDemoClass();
\t}
}
`;

    const doc = TextDocument.create('test://test.idl', 'midl3', 1, input);
    const edits = formatDocument(doc, { tabSize: 1, insertSpaces: false });
    
    assert.strictEqual(edits.length, 1);
    assert.strictEqual(edits[0].newText, expected);
  });

  it('should return empty array when no changes needed', () => {
    const input = `namespace DemoNamespace
{
\truntimeclass DemoClass
\t{
\t\tDemoClass();
\t}
}
`;

    const doc = TextDocument.create('test://test.idl', 'midl3', 1, input);
    const edits = formatDocument(doc, { tabSize: 1, insertSpaces: false });
    
    assert.strictEqual(edits.length, 0);
  });
});
