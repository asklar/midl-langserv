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
	const testCaseFolders = path.resolve(__dirname, '..', '..', 'src', 'test', 'assets');

  it('Validate idl path for test cases', () => {
    assert(fs.existsSync(testCaseFolders), `Path ${testCaseFolders} does not exist`);
  });
	
	runParserOnFolder(testCaseFolders);

	const goodIdlPath = process.env['GOOD_IDL_PATH']!;
	if(fs.existsSync(goodIdlPath)){
		runParserOnFolder(goodIdlPath);
	}
});


function runParserOnFolder(folderPath: string){
  const goodIdlFileSpec = path.join(folderPath, '*.idl');

  new glob.GlobSync(goodIdlFileSpec).found.forEach(idlPath => {
    const testName = path.basename(idlPath);

    it("can parse file " + testName, async (done) => {
      const contents = fs.readFileSync(idlPath).toString();
      const tokens: IParsedToken[] = [];
      try {
        assert.doesNotThrow(() => grammar.parse(contents, { tokenList: tokens }));
      } catch (e) {
        done(e);
        return;
      }
      assert.notStrictEqual(tokens.length, 0);
      done();
    });
  });
}