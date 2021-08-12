import { test } from 'mocha';
import * as assert from 'assert';

import * as fs from 'fs';
import * as path from 'path';
import { IParsedToken } from '../Model'

import * as pegjs from 'pegjs';
import * as glob from 'glob';

const grammarFilePath = fs.realpathSync(path.join(__dirname, '..', 'midl.pegjs'));
const grammarFile = fs.readFileSync(grammarFilePath).toString();

const grammar = pegjs.generate(grammarFile);


describe('Parser tests', async () => {
  const goodIdlPath = process.env['GOOD_IDL_PATH']!;

  it('Validate idl path', () => {
    assert(goodIdlPath && goodIdlPath.length > 0, "Must set GOOD_IDL_PATH env var");
    assert(fs.existsSync(goodIdlPath), `Path ${goodIdlPath} does not exist`);
  });

  const goodIdlFileSpec = path.join(goodIdlPath, '*.idl');

  new glob.GlobSync(goodIdlFileSpec).found.forEach(idlPath => {
    const testName = path.basename(idlPath);

    it(testName, async (done) => {
      const contents = fs.readFileSync(idlPath).toString();
      const tokens: IParsedToken[] = [];
      assert.doesNotThrow(() => grammar.parse(contents, { tokenList: tokens }));
      assert.notStrictEqual(tokens.length, 0);
      done();
    });
  });
});
