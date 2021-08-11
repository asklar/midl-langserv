import { CancellationToken, DocumentSemanticTokensProvider, SemanticTokens, SemanticTokensBuilder, TextDocument } from 'vscode';
import { IParsedToken } from "./Model";
import { tokenModifiers } from './extension';
import { TokenTypes } from "./TokenType";

import { DocumentUri, LanguageClient } from 'vscode-languageclient/node';

export class MidlDocumentSemanticTokensProvider implements DocumentSemanticTokensProvider {
  constructor(readonly client: LanguageClient) {}
  async provideDocumentSemanticTokens(document: TextDocument, token: CancellationToken): Promise<SemanticTokens> {

    const allTokens = await this._parseText(document.uri.path, document.getText());
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
  

  private async _parseText(uri: DocumentUri, text: string): Promise<IParsedToken[]> {
    try {
      await this.client.onReady();
      const result = await this.client.sendRequest<IParsedToken[]>('parse', {uri: uri, text: text});
      return result;
    } catch (e) {
      console.log(JSON.stringify(e));
    }
  }
  
}
