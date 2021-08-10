import { TokenType } from './TokenType';

export interface IParsedToken {
  line: number;
  startCharacter: number;
  length: number;
  tokenType: TokenType;
  tokenModifiers: string[];
  startIndex: number;
}
