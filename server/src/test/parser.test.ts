import { suite, test } from 'mocha';
import * as assert from 'assert';

import * as fs from 'fs';
import * as path from 'path';
import { IParsedToken } from '../Model'

import * as pegjs from 'pegjs';
import * as glob from 'glob';

const grammarFilePath = fs.realpathSync(path.join(__dirname, '..', 'midl.pegjs'));
const grammarFile = fs.readFileSync(grammarFilePath).toString();

const grammar = pegjs.generate(grammarFile);


suite('Parser tests', () => {

  let goodIdlPath = 'C:/os/src/shellcommon/UndockedDevKit/idl';
  if (!fs.existsSync(goodIdlPath)) {
    goodIdlPath = process.env['GOOD_IDL_PATH']!;
  }
  const goodIdlFileSpec = path.join(goodIdlPath, '*.idl');

  new glob.GlobSync(goodIdlFileSpec).found.forEach(idlPath => {
    const testName = path.basename(idlPath);
    test(testName, () => {
      const contents = fs.readFileSync(idlPath).toString();
      const tokens: IParsedToken[] = [];
      assert.doesNotThrow(() => grammar.parse(contents, {tokenList: tokens}));
      assert.notStrictEqual(tokens.length, 0);
    }); 
  });
});
