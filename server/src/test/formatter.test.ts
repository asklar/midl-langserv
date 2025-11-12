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

  it('should format compact single-line code', () => {
    const input = `namespace foo{    runtimeclass bar{    }}`;

    const expected = `namespace foo
{
    runtimeclass bar
    {
    }
}
`;

    const doc = TextDocument.create('test://test.idl', 'midl3', 1, input);
    const edits = formatDocument(doc, { tabSize: 4, insertSpaces: true }, 'newLine');
    
    assert.strictEqual(edits.length, 1);
    assert.strictEqual(edits[0].newText, expected);
  });

  it('should format compact code with property', () => {
    const input = `namespace foo{    runtimeclass bar{  Int32 g{get;set;};  }}`;

    const expected = `namespace foo
{
    runtimeclass bar
    {
        Int32 g{ get; set; };
    }
}
`;

    const doc = TextDocument.create('test://test.idl', 'midl3', 1, input);
    const edits = formatDocument(doc, { tabSize: 4, insertSpaces: true }, 'newLine');
    
    assert.strictEqual(edits.length, 1, 'Should have edits');
    assert.strictEqual(edits[0].newText, expected, 'Should format correctly without losing content');
  });

  it('should handle multiple properties in compact code', () => {
    const input = `namespace foo{runtimeclass bar{Int32 a{get;};String b{set;};Boolean c{get;set;};}}`;

    const expected = `namespace foo
{
    runtimeclass bar
    {
        Int32 a{ get; };
        String b{ set; };
        Boolean c{ get; set; };
    }
}
`;

    const doc = TextDocument.create('test://test.idl', 'midl3', 1, input);
    const edits = formatDocument(doc, { tabSize: 4, insertSpaces: true }, 'newLine');
    
    assert.strictEqual(edits.length, 1);
    assert.strictEqual(edits[0].newText, expected);
  });

  it('should handle nested braces', () => {
    const input = `namespace outer{namespace inner{runtimeclass Test{}}}`;

    const expected = `namespace outer
{
    namespace inner
    {
        runtimeclass Test
        {
        }
    }
}
`;

    const doc = TextDocument.create('test://test.idl', 'midl3', 1, input);
    const edits = formatDocument(doc, { tabSize: 4, insertSpaces: true }, 'newLine');
    
    assert.strictEqual(edits.length, 1);
    assert.strictEqual(edits[0].newText, expected);
  });

  it('should preserve braces in comments', () => {
    const input = `namespace foo
{
    // This has { braces } in comment
    runtimeclass bar
    {
        /* Another { brace } */
        Int32 prop;
    }
}`;

    const doc = TextDocument.create('test://test.idl', 'midl3', 1, input);
    const edits = formatDocument(doc, { tabSize: 4, insertSpaces: true }, 'newLine');
    
    // Should not change because it's already well-formatted
    // Just ensure it doesn't break
    assert.strictEqual(edits.length <= 1, true);
    if (edits.length > 0) {
      assert.ok(edits[0].newText.includes('{ braces }'));
      assert.ok(edits[0].newText.includes('{ brace }'));
    }
  });

  it('should handle methods with parameters', () => {
    const input = `namespace foo{runtimeclass bar{void DoSomething(Int32 x,String y);}}`;

    const expected = `namespace foo
{
    runtimeclass bar
    {
        void DoSomething(Int32 x, String y);
    }
}
`;

    const doc = TextDocument.create('test://test.idl', 'midl3', 1, input);
    const edits = formatDocument(doc, { tabSize: 4, insertSpaces: true }, 'newLine');
    
    assert.strictEqual(edits.length, 1);
    assert.strictEqual(edits[0].newText, expected);
  });

  it('should put attributes on separate lines', () => {
    const input = `namespace foo{    [foo(a, "b")]runtimeclass bar{ x a;}    }`;

    const expected = `namespace foo
{
    [foo(a, "b")]
    runtimeclass bar
    {
        x a;
    }
}
`;

    const doc = TextDocument.create('test://test.idl', 'midl3', 1, input);
    const edits = formatDocument(doc, { tabSize: 4, insertSpaces: true }, 'newLine');
    
    assert.strictEqual(edits.length, 1);
    assert.strictEqual(edits[0].newText, expected);
  });

  it('should handle multiple attributes', () => {
    const input = `namespace foo{[attr1][attr2]runtimeclass bar{}}`;

    const expected = `namespace foo
{
    [attr1]
    [attr2]
    runtimeclass bar
    {
    }
}
`;

    const doc = TextDocument.create('test://test.idl', 'midl3', 1, input);
    const edits = formatDocument(doc, { tabSize: 4, insertSpaces: true }, 'newLine');
    
    assert.strictEqual(edits.length, 1);
    assert.strictEqual(edits[0].newText, expected);
  });

  it('should handle attributes with nested brackets', () => {
    const input = `namespace foo{[attr(arr[0])]runtimeclass bar{}}`;

    const expected = `namespace foo
{
    [attr(arr[0])]
    runtimeclass bar
    {
    }
}
`;

    const doc = TextDocument.create('test://test.idl', 'midl3', 1, input);
    const edits = formatDocument(doc, { tabSize: 4, insertSpaces: true }, 'newLine');
    
    assert.strictEqual(edits.length, 1);
    assert.strictEqual(edits[0].newText, expected);
  });

  it('should remove extra blank lines', () => {
    const input = `namespace foo
{


    runtimeclass bar

    {
        Int32 x;
    }
}`;

    const expected = `namespace foo
{
    runtimeclass bar
    {
        Int32 x;
    }
}
`;

    const doc = TextDocument.create('test://test.idl', 'midl3', 1, input);
    const edits = formatDocument(doc, { tabSize: 4, insertSpaces: true }, 'newLine');
    
    assert.strictEqual(edits.length, 1);
    assert.strictEqual(edits[0].newText, expected);
  });

  it('should ensure empty line between imports and first non-import', () => {
    const input = `import "Windows.Foundation.idl";
namespace foo
{
}`;

    const expected = `import "Windows.Foundation.idl";

namespace foo
{
}
`;

    const doc = TextDocument.create('test://test.idl', 'midl3', 1, input);
    const edits = formatDocument(doc, { tabSize: 4, insertSpaces: true }, 'newLine');
    
    assert.strictEqual(edits.length, 1);
    assert.strictEqual(edits[0].newText, expected);
  });

  it('should keep semicolon on same line as closing brace for interfaces', () => {
    const input = `interface IFoo
{
    void Bar();
}
;`;

    const expected = `interface IFoo
{
    void Bar();
};
`;

    const doc = TextDocument.create('test://test.idl', 'midl3', 1, input);
    const edits = formatDocument(doc, { tabSize: 4, insertSpaces: true }, 'newLine');
    
    assert.strictEqual(edits.length, 1);
    assert.strictEqual(edits[0].newText, expected);
  });

  it('should keep attributes on same line for method parameters', () => {
    const input = `interface IFoo
{
    void Bar([in] Int32 x, [out] String y);
}
;`;

    const expected = `interface IFoo
{
    void Bar([in] Int32 x, [out] String y);
};
`;

    const doc = TextDocument.create('test://test.idl', 'midl3', 1, input);
    const edits = formatDocument(doc, { tabSize: 4, insertSpaces: true }, 'newLine');
    
    assert.strictEqual(edits.length, 1);
    assert.strictEqual(edits[0].newText, expected);
  });

  it('should keep attributes on same line for properties', () => {
    const input = `runtimeclass Foo
{
    [Windows.Foundation.Metadata.DefaultOverload]
    void Bar();
    [deprecated("Use NewProp", deprecate, 1)]String OldProp{ get; };
}`;

    const expected = `runtimeclass Foo
{
    [Windows.Foundation.Metadata.DefaultOverload]
    void Bar();
    [deprecated("Use NewProp", deprecate, 1)] String OldProp{ get; };
}
`;

    const doc = TextDocument.create('test://test.idl', 'midl3', 1, input);
    const edits = formatDocument(doc, { tabSize: 4, insertSpaces: true }, 'newLine');
    
    assert.strictEqual(edits.length, 1);
    assert.strictEqual(edits[0].newText, expected);
  });
});
