import { CancellationToken, DocumentSemanticTokensProvider, SemanticTokens, SemanticTokensBuilder, TextDocument } from 'vscode';
import { MidlParser } from './MidlParser';
import { IParsedToken } from "./Model";
import { tokenTypes, tokenModifiers } from './extension';
import { TokenType } from "./TokenType";

export class MidlDocumentSemanticTokensProvider implements DocumentSemanticTokensProvider {
  async provideDocumentSemanticTokens(document: TextDocument, token: CancellationToken): Promise<SemanticTokens> {
    const allTokens = this._parseText(document.getText());
    const builder = new SemanticTokensBuilder();
    allTokens.forEach((token) => {
      builder.push(token.line, token.startCharacter, token.length, this._encodeTokenType(token.tokenType), this._encodeTokenModifiers(token.tokenModifiers));
    });
    return builder.build();
  }
  
  private _encodeTokenType(tokenType: TokenType): number {
    if (tokenTypes.has(tokenType)) {
      return tokenTypes.get(tokenType)!;
    } else if (tokenType?.toString() === 'notInLegend') {
      return tokenTypes.size + 2;
    }
    return 0;
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
    const parser = new MidlParser(text);

    // console.log(JSON.stringify(parser.parsedModel, null, 2));
    // console.log();
    console.log('Errors:');
    console.log(parser.errors);

    if (parser.parsedTokens.length === 0) {
      // give something back
      return [{
        length: 0,
        startCharacter: 0,
        startIndex: 0,
        line: 0,
        tokenModifiers: [],
        tokenType: undefined
      }];
    }
    return parser.parsedTokens;
  }
  
  
}
