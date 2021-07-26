//import * as MidlParser from '../MidlParser';
import { suite, test } from 'mocha';
import * as assert from 'assert';
import { MidlParser, ParserBase } from '../MidlParser';
import { TokenType } from '../TokenType';
import * as glob from 'glob';
import * as path from 'path';
import * as fs from 'fs';

suite('Parser tests', () => {

  
  const idlRoot = path.join(__dirname, '../../src/test');
	const testsRoot = __dirname;

  glob('*.idl', {cwd: idlRoot}, (err, files) => {
    if (err) {
      throw 'Error';
    }
    files.forEach(f => {
      console.log(`Test file: ${f}`);
      const base = path.basename(f, path.extname(f));
      const snap = path.join(testsRoot, base + '.snap.js');
      const idl = fs.readFileSync(path.join(idlRoot, f)).toString();
      const expected = require(snap);
      test(base, async () => {
        await testParser(idl, expected);
      })
    });
  });

  test('empty', async () => {
    await testParser('', {
      errors: [],
      parsedModel: [],
      parsedTokens: [],
    });
  }),
  test('comments 1', async () => {
    await testParser('// hello {}', {
      errors: [],
      parsedModel: [],
      parsedTokens: [{
        context: undefined,
        roleInContext: undefined,
        line: 0,
        startCharacter: 0,
        startIndex: 0,
        length: 11,
        tokenModifiers: [],
        tokenType: TokenType.comment,
      }],
    });
  }),
  test('comments 1 with EOL', async () => {
    await testParser('// hello {}\n', {
      errors: [],
      parsedModel: [],
      parsedTokens: [{
        context: undefined,
        roleInContext: undefined,
        line: 0,
        startCharacter: 0,
        startIndex: 0,
        length: 12,
        tokenModifiers: [],
        tokenType: TokenType.comment,
      }],
    });
  }),
  test('multiline comment', async () => {
    await testParser('/* hello {} */', {
      errors: [],
      parsedModel: [],
      parsedTokens: [{
        context: undefined,
        roleInContext: undefined,
        line: 0,
        startCharacter: 0,
        startIndex: 0,
        length: 14,
        tokenModifiers: [],
        tokenType: TokenType.comment,
      }],
    });
  }),
  test('multiline comment with EOL', async () => {
    await testParser('/* hello {} */\n', {
      errors: [],
      parsedModel: [],
      parsedTokens: [{
        context: undefined,
        roleInContext: undefined,
        line: 0,
        startCharacter: 0,
        startIndex: 0,
        length: 14,
        tokenModifiers: [],
        tokenType: TokenType.comment,
      }],
    });
  }),
  test('multiline comment with NL', async () => {
    await testParser('/* hello\nworld */', {
      errors: [],
      parsedModel: [],
      parsedTokens: [{
        context: undefined,
        roleInContext: undefined,
        line: 0,
        startCharacter: 0,
        startIndex: 0,
        length: 17,
        tokenModifiers: [],
        tokenType: TokenType.comment,
      }],
    });
  }),
  test('#include 1', async () => {
    await testParser('#include <foo.h>', {
      errors: [],
      parsedModel: [],
      parsedTokens: [{
        context: undefined,
        roleInContext: undefined,
        line: 0,
        startCharacter: 0,
        startIndex: 0,
        length: 16,
        tokenModifiers: [],
        tokenType: TokenType.preProcessor,
      }],
    });
  }),
  test('#include 1 with EOL', async () => {
    await testParser('#include <foo.h>\r\n', {
      errors: [],
      parsedModel: [],
      parsedTokens: [{
        context: undefined,
        roleInContext: undefined,
        line: 0,
        startCharacter: 0,
        startIndex: 0,
        length: 18,
        tokenModifiers: [],
        tokenType: TokenType.preProcessor,
      }],
    });
  }),
  test('error 1', async () => {
    await testParser('{', {
      errors: [],
      parsedModel: [],
      parsedTokens: [{
        context: undefined,
        roleInContext: undefined,
        line: 0,
        startCharacter: 0,
        startIndex: 0,
        length: 1,
        tokenModifiers: [],
        tokenType: TokenType.scopeToken,
      }],
    });
  })

});

async function testParser(text: string, expected: ParserBase) {
  const parser = new MidlParser(text);

  assert.deepStrictEqual(parser.errors, expected.errors);
  assert.deepStrictEqual(parser.parsedModel, expected.parsedModel);
  assert.deepStrictEqual(parser.parsedTokens, expected.parsedTokens);
}