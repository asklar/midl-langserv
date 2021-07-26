import { IParsedToken, Namespace, ParseError } from '../Model';
import { TokenType } from '../TokenType';

export const errors: ParseError[] = [];
export const parsedModel: Namespace[] = [
  {
    "id": "Foo",
    "tokens": [],
    "type": "Namespace",
    "types": []
  }
];
export const parsedTokens: IParsedToken[] = [
  {
    line: 0,
    startCharacter: 0,
    startIndex: 0,
    length: 9,
    tokenModifiers: [],
    tokenType: TokenType.keyword,
  },
  {
    line: 0,
    startCharacter: 10,
    startIndex: 10,
    length: 3,
    tokenModifiers: [],
    tokenType: TokenType.namespace,
  },
  {
    line: 0,
    startCharacter: 14,
    startIndex: 14,
    length: 1,
    tokenModifiers: [],
    tokenType: TokenType.scopeToken,
  }
];