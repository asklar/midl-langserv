import { CancellationToken, DocumentSemanticTokensProvider, SemanticTokens, SemanticTokensBuilder, TextDocument } from 'vscode';
//import { MidlParser } from './MidlParser';
import { IParsedToken } from "./Model";
import { tokenTypes, tokenModifiers } from './extension';
import { TokenTypes, TokenType_old } from "./TokenType";

import * as fs from 'fs';
import * as path from 'path';
import * as pegjs from 'pegjs';

const cwd = __dirname;
const grammarFilePath = fs.realpathSync(path.join(__dirname, 'midl.pegjs'));
const grammarFile = fs.readFileSync(grammarFilePath).toString();


let tokens: IParsedToken[] = [];

const grammar = pegjs.generate(grammarFile);

export class MidlDocumentSemanticTokensProvider implements DocumentSemanticTokensProvider {
  async provideDocumentSemanticTokens(document: TextDocument, token: CancellationToken): Promise<SemanticTokens> {
    const allTokens = this._parseText(document.getText());
    const builder = new SemanticTokensBuilder();
    allTokens.forEach((token) => {
      builder.push(token.line, token.startCharacter, token.length, this._encodeTokenType(token.tokenType), this._encodeTokenModifiers(token.tokenModifiers));
    });

    return builder.build();
  }
  
  private _encodeTokenType(tokenType: string): number {
    const idx = TokenTypes.findIndex(e => e === tokenType);
    if (idx !== -1) {
      return idx;
    }
    return TokenTypes.length + 2;
  }
  
  private _encodeTokenModifiers(strTokenModifiers: string[]): number {
    let result = 0;
    for (let i = 0; i < strTokenModifiers.length; i++) {
      const tokenModifier = strTokenModifiers[i];
      if (tokenModifiers.has(tokenModifier)) {
        result = result | (1 << tokenModifiers.get(tokenModifier)!);
      } else if (tokenModifier === 'notInLegend') {
        result = result | (1 << tokenModifiers.size + 2);
      }
    }
    return result;
  }
  

  private _parseText(text: string): IParsedToken[] {
    try {
      const parsed = grammar.parse(text, {tokenList: tokens}).filter(x => x !== undefined);
      const t = tokens;
      tokens = [];
      console.log(JSON.stringify(t, null, 2));
      return t;
    } catch (e) {
      console.log(JSON.stringify(e));
    }
  }

  // private _parseTextOld(text: string): IParsedToken[] {
  //   const parser = new MidlParser(text);

  //   // console.log(JSON.stringify(parser.parsedModel, null, 2));
  //   // console.log();
  //   console.log('Errors:');
  //   console.log(parser.errors);

  //   if (parser.parsedTokens.length === 0) {
  //     // give something back
  //     return [{
  //       length: 0,
  //       startCharacter: 0,
  //       startIndex: 0,
  //       line: 0,
  //       tokenModifiers: [],
  //       tokenType: undefined
  //     }];
  //   }
  //   return parser.parsedTokens;
  // }
  
  
}
