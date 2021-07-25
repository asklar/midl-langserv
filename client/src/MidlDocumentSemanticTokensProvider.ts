import { CancellationToken, DocumentSemanticTokensProvider, SemanticTokens, SemanticTokensBuilder, TextDocument } from 'vscode';
import { TokenType, tokenTypes, tokenModifiers } from './extension';

type ContextRole = 'name' | 'returnType' | 'enumValue';

interface IParsedToken {
  line: number;
  startCharacter: number;
  length: number;
  tokenType: TokenType; //string;
  tokenModifiers: string[];
  startIndex: number;
  context?: Namespace | Type | Member | ParameterScope;
  roleInContext?: ContextRole;
}

class Stack<T>  {
  private storage: T[] = [];
  
  constructor(private capacity: number = Infinity) {}
  
  push(item: T): void {
    if (this.size() === this.capacity) {
      throw Error("Stack has reached max capacity, you cannot add more items");
    }
    this.storage.push(item);
  }
  
  pop(): T | undefined {
    return this.storage.pop();
  }
  
  peek(s: number = 0): T | undefined {
    return this.storage[this.size() - 1 + s];
  }
  
  size(): number {
    return this.storage.length;
  }
}

enum ElementType {
  Namespace,
  Type,
  Member,
  ParameterScope,
  Parameter,
  Property,
};

type Parameter = {
  type: ElementType.Parameter,
  paramType: string;
  id: string;
};

type ParameterScope = {
  type: ElementType.ParameterScope,
  params: Parameter[];
};

type PropertyScope = {
  type: ElementType.Property,
};

type MemberKind = 'method' | 'ctor' | 'event' | 'property' | 'field' | undefined;

type Member = {
  type: ElementType.Member,
  id: string,
  displayName: string,
  kind: MemberKind,
  returnType?: string,
  paramScope?: ParameterScope,
  accessors?: string[],
};

type TypeKind = 'runtimeclass' | 'interface' | 'enum' | 'delegate' | 'struct' | undefined;

type Type = {
  type: ElementType.Type,
  id: string,
  kind: TypeKind,
  members: Member[],
  extends: string[],
};

type Namespace = {
  type: ElementType.Namespace,
  id: string,
  types: Type[],
};

type ParseError = {
  line: number,
  col: number,
  token: string,
};

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
  
  private startsWithEol(text: string) {
    if (text.startsWith('\r\n')) return 2;
    else if (text.startsWith('\r') || text.startsWith('\n')) return 1;
    else return 0;
  }
  
  private tokenStringMap : Array<{key: string | RegExp, value: TokenType, modifier?: string}> = [
    { key: /^"[^"]*"/, value: TokenType.string },
    { key: /^\/\/.*(\r\n|\r|\n)/, value: TokenType.comment },
    { key: /^#(include|pragma|define|ifdef|endif|if)\b.*(\r\n|\r|\n)/, value: TokenType.preProcessor },
    { key: /^(get|set)\b/, value: TokenType.method },
    { key: /^import\b/, value: TokenType.keyword},
    { key: /^\[.*\]/, value: TokenType.attribute },
    { key: /^(namespace|runtimeclass|struct|interface|enum|delegate|event|get|set)\b/, value: TokenType.keyword },
    { key: /^[\(\)\{\}]/, value: TokenType.scopeToken },
    { key: /^;/, value: TokenType.semicolon },
    { key: /^:/, value: TokenType.colon },
    { key: /^,/, value: TokenType.comma },
    { key: /^(Int16|Int32|Int64|UInt8|UInt16|UInt32|UInt64|Char|String|Single|Double|Boolean|Guid|void)\b/, value: TokenType.type, modifier: 'defaultLibrary' },
    { key: /^=/, value: TokenType.operator },
    { key: /^\d+/, value: TokenType.number },
    { key: /^([\w\d_]+\.)*[\w\d_]+/, value: TokenType.identifier},
  ];
  
  parsedModel : Namespace[]  = [];
  errors: ParseError[] = [];
  
  private static GetTokenTypeForMember(memberKind: string) {
    switch (memberKind) {
      case 'method': return TokenType.method;
      case 'ctor': return TokenType.method;
      case 'event': return TokenType.method;
      case 'property': return TokenType.property;
      case 'field': return TokenType.property;
    }

    return undefined;
  }
  
  private static GetTokenTypeForType(kindName: string) {
    switch (kindName) {
      case 'runtimeclass':	return TokenType.class;
      case 'delegate': 		return TokenType.class;
      case 'interface':
      case 'enum':
      case 'struct':
      return TokenType[kindName];
    }
    return TokenType[kindName];
  }
  
  private _parseText(text: string): IParsedToken[] {
    const r: IParsedToken[] = [];
    
    let inString = false;
    let line = 0;
    let col = 0;
    
    const currentScope = new Stack<Namespace|Type|Member|ParameterScope|Parameter|PropertyScope>();
    let lastProcessed = -1;
    for (let i = 0; i < text.length; ) {
      if (lastProcessed === i) {
        // we didn't match anything... error out
        this.errors.push({
          line: line,
          col: col,
          token: text[i],
        });
        break;
      }
      lastProcessed = i;
      if (!inString) {
        let foundSpace = false;
        while (text[i] === ' ' || text[i] === '\t') {
          i++; // skip whitespace
          col++;
          foundSpace = true;
        }
        if (foundSpace) {
          continue;
        }
      }
      const now = text.substr(i);
      
      const eolLength = this.startsWithEol(now);
      if (eolLength !== 0) {
        line++;
        col = 0;
        i += eolLength;
        continue;
      }
      if (!inString) {
        
        if (text[i] === '"') {
          i++;
          col++;
          inString = !inString; // TO-DO: handle escaped quotes
          continue;
        }
        
        for (const t of this.tokenStringMap) {
          const m = now.match(t.key);
          if (m !== null) {
            let roleInContext: ContextRole = undefined;
            const len = m[0].length;
            const currentContent = text.substr(i, len);
            var tokenType = t.value;
            
            const prevToken = r.length > 0 ? r[r.length - 1] : null;
            const prevContent = prevToken ? text.substr(prevToken.startIndex, prevToken.length) : null;
            
            if (now.startsWith('{')) {
              // new scope is started, maybe we need to correct the properties on the new scope
              if (currentScope.size() > 0 && 
                  currentScope.peek().type === ElementType.Member) {
                const member = currentScope.peek() as Member;
                member.kind = 'property';
                const property: PropertyScope = {
                  type: ElementType.Property,
                };
                member.accessors = [];
                currentScope.push(property);
              }
            } else if (now.startsWith('}')) {
              currentScope.pop();
            } else if (now.startsWith('(')) {
              if (prevToken.tokenType === TokenType.identifier || prevToken.tokenType === TokenType.class) {
                if (currentScope.peek().type == ElementType.Type) {
                  const _type = currentScope.peek() as Type;
                  if (_type.kind === 'delegate') {
                    const invokeParams: ParameterScope = {
                      params: [],
                      type: ElementType.ParameterScope,
                    };
                    const invoke: Member = {
                      id: 'Invoke',
                      displayName: '',
                      kind: 'method',
                      type: ElementType.Member,
                      paramScope: invokeParams,
                    };

                    _type.members.push(invoke);
                    currentScope.push(invokeParams);
                  }
                } else if (currentScope.peek().type == ElementType.Member) {
                  const member = currentScope.peek() as Member;
                  if (member.kind === 'method' || member.kind === 'ctor') {
                    if (currentScope.peek(-1).type === ElementType.Type) {
                      const _type = currentScope.peek(-1) as Type;
                      if (_type.id === member.displayName) {
                        member.kind = 'ctor';
                      } else {
                        member.kind = 'method';
                      }
                    }
                    const paramScope: ParameterScope = {
                      type: ElementType.ParameterScope,
                      params: []
                    };
                    member.paramScope = paramScope;
                    currentScope.push(paramScope);
                  }
                } else {
                  // TODO: error
                }
              }
            } else if (currentContent === ')') {
              currentScope.pop();
            } else if (currentContent === ',') {
              if (currentScope.peek().type === ElementType.Member &&
               currentScope.peek(-1).type === ElementType.Type &&
               (currentScope.peek(-1) as Type).kind === 'enum'
               ) {
                 currentScope.pop();
               }
            }
            
            if (currentScope.size() == 0) {
              if (prevContent === 'namespace') {
                const ns : Namespace = {
                  type: ElementType.Namespace,
                  id: currentContent,
                  types: []
                };
                currentScope.push(ns);
                this.parsedModel.push(ns);
              }
            } else {
              switch (currentScope.peek().type) {
                case ElementType.Namespace: {
                  const ns = currentScope.peek() as Namespace;   
                  
                  if (t.value === TokenType.identifier) {
                    if (prevToken !== null) {											
                      switch (prevToken.tokenType) {
                        case TokenType.keyword: {
                          // a type declaration like: runtimeclass MyClass
                          tokenType = MidlDocumentSemanticTokensProvider.GetTokenTypeForType(prevContent);
                          
                          const _type : Type = {
                            type: ElementType.Type,
                            id: currentContent,
                            kind: prevContent as TypeKind,
                            members: [],
                            extends: [],
                          };
                          ns.types.push(_type);
                          currentScope.push(_type);
                        }
                        break;
                      }
                    }
                  }
                  break;
                }
                
                case ElementType.Type: {
                  const _type = currentScope.peek() as Type;
                  if (_type.kind !== 'enum' &&
                      _type.kind !== 'struct' &&
                      (prevToken.tokenType === TokenType.colon || prevToken.tokenType === TokenType.comma)) {
                        // TODO: should error if we find more than one colon
                    _type.extends.push(currentContent);
                    break;
                  } else if (tokenType === TokenType.identifier || tokenType === TokenType.type) {
                    // a method / property declaration: MyType Foo { get; } or MyType Foo();
                    if (_type.kind === 'enum') {
                      roleInContext = 'enumValue';
                    } else {
                      roleInContext = 'returnType';
                    }
                    const member : Member = {
                      type: ElementType.Member,
                      id: currentContent,
                      displayName: currentContent,
                      kind: (_type.kind === 'enum' || _type.kind === 'struct') ? 'field' : undefined, // we don't know yet what it is
                    };
                    _type.members.push(member);
                    currentScope.push(member);
                  }
                  break;
                }
                
                case ElementType.Member: {
                  const member = currentScope.peek() as Member;
                  if (tokenType === TokenType.identifier) {
                    roleInContext = 'name';
                    // fix up the Member and its return type
                    if (member.returnType === undefined) {
                      member.returnType = member.displayName;
                      member.id = currentContent;
                      member.displayName = currentContent;
                    } else {
                      // TODO: Error
                    }
                  } else if (tokenType === TokenType.semicolon) {
                    currentScope.pop();
                  }
                  break;
                }
                
                case ElementType.ParameterScope: {
                  const paramScope = currentScope.peek() as ParameterScope;
                  
                  if (tokenType === TokenType.identifier) {
                    if (paramScope.params.length == 0) {
                      const p: Parameter = {
                        type: ElementType.Parameter,
                        paramType: currentContent,
                        id: undefined,
                      };
                      roleInContext = 'returnType';
                      paramScope.params.push(p);
                    } else {
                      const p = paramScope.params[paramScope.params.length - 1];
                      if (p.id === undefined && p.paramType) {
                        p.id = currentContent;
                        roleInContext = 'name';
                      } else {
                        // TODO: Error
                      }
                    }
                  }
                  break;
                }
                
                case ElementType.Property: {
                  const propScope = currentScope.peek() as PropertyScope;
                  const member = currentScope.peek(-1) as Member;
                  
                  if (tokenType === TokenType.method) {
                    member.accessors.push(currentContent);
                  } else {
                    // TODO: Error
                  }
                  break;
                }
              }
            }
            
            let context: Namespace | Type | Member | ParameterScope | undefined = undefined;
            if (currentScope.size() > 0) {
              switch (currentScope.peek().type) {
                case ElementType.Namespace:
                case ElementType.Type:
                case ElementType.Member:
                case ElementType.ParameterScope:
                context = currentScope.peek() as (Namespace|Type|Member|ParameterScope);
                break;
              }
            }
            
            const modifiers = t.modifier ? [ t.modifier ] : [];
            r.push({
              line: line,
              startCharacter: col,
              length: len,
              tokenType: tokenType,
              tokenModifiers: modifiers,
              startIndex: i,
              context: context,
              roleInContext: roleInContext,
            });
            i += len;
            
            if (m[0].match(/(\r\n|\r|\n)/)) {
              line++;
              col = 0;
            } else {
              col += len;
            }
            break;
          }
        }
      }
    }
    
    /*
    const lines = text.split(/\r\n|\r|\n/);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      let currentOffset = 0;
      do {
        const openOffset = line.indexOf('[', currentOffset);
        if (openOffset === -1) {
          break;
        }
        const closeOffset = line.indexOf(']', openOffset);
        if (closeOffset === -1) {
          break;
        }
        const tokenData = this._parseTextToken(line.substring(openOffset + 1, closeOffset));
        r.push({
          line: i,
          startCharacter: openOffset + 1,
          length: closeOffset - openOffset - 1,
          tokenType: tokenData.tokenType,
          tokenModifiers: tokenData.tokenModifiers
        });
        currentOffset = closeOffset;
      } while (true);
    }
    */
    for (const entry of r) {
      if (entry.tokenType === TokenType.identifier && entry.context !== undefined) {
        const content = text.substr(entry.startIndex, entry.length);

        switch (entry.context.type) {
          case ElementType.Namespace: {
            entry.tokenType = TokenType.namespace;
            break;
          }
          case ElementType.Type: {
            const _type = entry.context as Type;
            entry.tokenType = MidlDocumentSemanticTokensProvider.GetTokenTypeForType(_type.kind);
            break;
          }
          case ElementType.Member: {
            const member = entry.context as Member;
            switch (entry.roleInContext) {
              case 'returnType':
                entry.tokenType = member.kind === 'ctor' ? TokenType.method : this.GetTypeKindTokenType(content);
                break;
              case 'name':
                entry.tokenType = MidlDocumentSemanticTokensProvider.GetTokenTypeForMember(member.kind);
                break;
              case 'enumValue':
                entry.tokenType = TokenType.enumMember;
                break;
              default:
                entry.tokenType = TokenType.identifier;
                break;
            }
            break;
          }
          case ElementType.ParameterScope: {
            const parameter = entry.context as ParameterScope;
            switch (entry.roleInContext) {
              case 'returnType':
                entry.tokenType = this.GetTypeKindTokenType(content);
                break;
              case 'name':
                entry.tokenType = TokenType.parameter;
                break;
            }
            break;
          }
        }
      }
    }
    return r;
  }
  
  
  GetTypeKindTokenType(fullName: string): TokenType {
    const nsName = fullName.substring(0, fullName.lastIndexOf('.'));
    const name = fullName.substring(fullName.lastIndexOf('.') + 1);
    const ns = this.parsedModel.find(n => n.id === nsName);
    if (ns) {
      const _type = ns.types.find(t => t.id === name);
      if (_type) {
        return MidlDocumentSemanticTokensProvider.GetTokenTypeForType(_type.kind);
      }
    }
    
    return TokenType.type;
  }
  
  // private _parseTextToken(text: string): { tokenType: string; tokenModifiers: string[]; } {
  // 	const parts = text.split('.');
  // 	return {
  // 		tokenType: parts[0],
  // 		tokenModifiers: parts.slice(1)
  // 	};
  // }
}
