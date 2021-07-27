import { Namespace, ParseError, IParsedToken, Scopeable, ContextRole, ElementType, Member, PropertyScope, Type, ParameterScope, TypeKind, MemberKind, Parameter } from './Model';
import { Stack } from './Stack';
import { TokenType } from './TokenType';

function last<T>(a: T[]) {
  return a[a.length - 1];
}

export class ParserBase {
  public readonly parsedModel: Namespace[] = [];
  public readonly errors: ParseError[] = [];
  public readonly parsedTokens: IParsedToken[] = [];
};

export class MidlParser extends ParserBase {

  private isEol(idx: number) {
    if (this.text.substr(idx, 2) === '\r\n') return 2;
    else if (this.text[idx] === '\r' || this.text[idx] === '\n') return 1;
    else return 0;
  }

  private tokenStringMap: Array<{ key: string | RegExp, value: TokenType, modifier?: string }> = [
    { key: /^"[^"]*"/, value: TokenType.string },
    { key: /^'[^']*'/, value: TokenType.string },
    { key: /^\/\/.*(\r\n|\r|\n)?/, value: TokenType.comment },
    { key: /^\/\*.*\*\//s, value: TokenType.comment },
    { key: /^#(include|pragma|define|ifdef|endif|if|ifndef)\b.*(\r\n|\r|\n)?/, value: TokenType.preProcessor },
    { key: /^(get|set)\b/, value: TokenType.method },
    { key: /^import\b/, value: TokenType.import },
    { key: /^\[.*\]/, value: TokenType.attribute },
    { key: /^(namespace|runtimeclass|struct|interface|enum|delegate|event|get|set)\b/, value: TokenType.keyword },
    { key: /^[\(\)\{\}]/, value: TokenType.scopeToken },
    { key: /^;/, value: TokenType.semicolon },
    { key: /^:/, value: TokenType.colon },
    { key: /^,/, value: TokenType.comma },
    { key: /^(Int16|Int32|Int64|UInt8|UInt16|UInt32|UInt64|Char|String|Single|Double|Boolean|Guid|void)\b/, value: TokenType.type, modifier: 'defaultLibrary' },
    { key: /^=/, value: TokenType.operator },
    { key: /^\d+/, value: TokenType.number },
    { key: /^([\w\d_]+\.)*[\w\d_]+/, value: TokenType.identifier },
  ];

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
      case 'runtimeclass': return TokenType.class;
      case 'delegate': return TokenType.class;
      case 'interface':
      case 'enum':
      case 'struct':
        return TokenType[kindName];
    }
    return TokenType[kindName];
  }
  private line = 0;
  private col = 0;
  private currentIdx = 0;

  private advance() {
    const eolLength = this.isEol(this.currentIdx);
    if (eolLength !== 0) {
      this.line++;
      this.col = 0;
    } else {
      this.col++;
      this.currentIdx++;
    }
    this.currentIdx += eolLength;
    return eolLength;
  }

  private isStringSyncToken() {
    switch (this.text[this.currentIdx]) {
      case '"':
      case "'":
        return 1;
    }
    return this.isEol(this.currentIdx);
  }

  private findSyncToken() {
    let foundSyncToken = false;
    let inString = null;

    console.log(`[findSyncToken] start at ${this.line},${this.col}`);

    while (this.currentIdx < this.text.length && !foundSyncToken) {
      if (!inString) {
        switch (this.text[this.currentIdx]) {
          case ']':
          case ')':
          case '}':
          case ';':
            foundSyncToken = true; break;
          case '"':
          case '\'':
            inString = this.text[this.currentIdx]; break;
          default:
            break;
        }
        this.advance();
      } else {
        // we are in a string, try to find a sync token: either end the string, or newline (assume strings with no embedded newlines)
        while (this.currentIdx < this.text.length) {
          const sst = this.isStringSyncToken();
          this.advance();
          if (sst) {
            inString = undefined;
            break;
          }
        }
      }
    }

    console.log(`[findSyncToken] end at ${this.line},${this.col}. Found = ${foundSyncToken}`);
    return foundSyncToken;
  }

  private lex() {
    const now = this.text.substr(this.currentIdx);

    for (const t of this.tokenStringMap) {
      const m = now.match(t.key);
      if (m !== null) {
        return {m, t};
      }
    }
    return null;
  }

  private currentScope = new Stack<Scopeable>();
  private uncommitted: IParsedToken[] = [];

  public constructor(public text: string) {
    super();

    let lastProcessed = -1;
    
    while (this.currentIdx < text.length) {
      if (lastProcessed === this.currentIdx) {
        // we didn't match anything... error out
        if (!this.AddError('Parse error')) {
          break;
        } else {
          continue;
        }
      }
      lastProcessed = this.currentIdx;
      let foundSpace = false;
      while (text[this.currentIdx] === ' ' || text[this.currentIdx] === '\t') {
        this.currentIdx++; // skip whitespace
        this.col++;
        foundSpace = true;
      }
      if (foundSpace) {
        continue;
      }

      const eolLength = this.isEol(this.currentIdx);
      if (eolLength !== 0) {
        this.advance();
        continue;
      }

      const {m, t} = this.lex();
      if (m !== null) {
        let roleInContext: ContextRole = undefined;
        const len = m[0].length;
        const currentContent = text.substr(this.currentIdx, len);
        var tokenType = t.value;

        const prevToken = this.uncommitted.length > 0 ?
                            last(this.uncommitted) : 
                            (this.parsedTokens.length > 0 ? last(this.parsedTokens) : null);
        const prevContent = prevToken ? text.substr(prevToken.startIndex, prevToken.length) : null;

        if (currentContent === '{') {
          // new scope is started, maybe we need to correct the properties on the new scope
          if (this.currentScope.size() > 0 &&
            this.currentScope.peek() instanceof Member) {
            const member = this.currentScope.peek() as Member;
            member.kind = 'property';
            const property = new PropertyScope();
            member.accessors = [];
            this.EnterNewScope(property);
          }
        } else if (currentContent === '}') {
          const last = this.ExitScope();
          if (this.currentScope.size() !== 0 && this.currentScope.peek() instanceof Type) {
            const type = this.currentScope.peek() as Type;
            if (type.kind === 'enum') {
              this.ExitScope();
            }
          } else if (last instanceof PropertyScope) {
            if (prevToken.tokenType !== TokenType.semicolon) {
              if (this.AddError(`Property accessors must be followed by a semicolon`)) {
                continue;
              }
            }
            const last2 = this.ExitScope();
            if (last2 instanceof Member) {
              const member = last2 as Member;
              if (member.accessors.length === 0) {
                this.AddError(`Property ${member.displayName} has no accessors`);
              } else {
                const badAccesors = member.accessors.filter(x => x !== 'get' && x !== 'set');
                if (badAccesors.length !== 0) {
                  this.AddError(`Bad accessors for property ${member.displayName} - ${badAccesors.join(', ')}`);
                }
                if (member.accessors.filter(x => x === 'get').length > 1) {
                  this.AddError(`More than one getter for property ${member.displayName}`);
                }
                if (member.accessors.filter(x => x === 'set').length > 1) {
                  this.AddError(`More than one setter for property ${member.displayName}`);
                }
              }
            } else {
              this.AddError(`Unexpected property inside non-member ${this.currentScope.peek().type}`);
            }

          }
        } else if (currentContent === '(') {
          if (prevToken.tokenType === TokenType.identifier || prevToken.tokenType === TokenType.class) {
            if (this.currentScope.peek() instanceof Type) {
              const _type = this.currentScope.peek() as Type;
              if (_type.kind === 'delegate') {
                const invokeParams = new ParameterScope();
                const invoke = new Member({
                  id: 'Invoke',
                  displayName: '',
                  kind: 'method',
                  paramScope: invokeParams,
                });

                _type.members.push(invoke);
                this.EnterNewScope(invokeParams);
              }
            } else if (this.currentScope.peek() instanceof Member) {
              const member = this.currentScope.peek() as Member;
              if (this.currentScope.peek(-1) instanceof Type) {
                const _type = this.currentScope.peek(-1) as Type;
                if (_type.id === member.displayName) {
                  member.kind = 'ctor';
                } else {
                  member.kind = 'method';
                }
                const paramScope = new ParameterScope();
                member.paramScope = paramScope;
                this.EnterNewScope(paramScope);
              }
            } else {
              this.AddError('Cannot begin method or delegate declaration because current scope is not a Type');
            }
          }
        } else if (currentContent === ')') {
          this.ExitScope();
        } else if (currentContent === ',') {
          if (this.currentScope.peek() instanceof Member &&
            this.currentScope.peek(-1) instanceof Type &&
            (this.currentScope.peek(-1) as Type).kind === 'enum'
          ) {
            this.ExitScope();
          }
        }

        if (prevContent === 'namespace') {
          if (this.currentScope.size() === 0 ||
            this.currentScope.peek() instanceof Namespace) {
            const ns = new Namespace({
              id: currentContent,
            });
            this.EnterNewScope(ns);
            this.parsedModel.push(ns);
          } else {
            this.AddError(`Namespaces can only appear at the top level or inside namespaces, current scope is ${this.currentScope.peek().type}`);
          }
        } else if (this.currentScope.size() !== 0) {
          switch (this.currentScope.peek().type) {
            case 'Namespace': {
              const ns = this.currentScope.peek() as Namespace;

              if (t.value === TokenType.identifier) {
                if (prevToken !== null) {
                  switch (prevToken.tokenType) {
                    case TokenType.keyword: {
                      // a type declaration like: runtimeclass MyClass
                      tokenType = MidlParser.GetTokenTypeForType(prevContent);

                      const _type = new Type({
                        id: currentContent,
                        kind: prevContent as TypeKind,
                      });
                      ns.types.push(_type);
                      this.EnterNewScope(_type);
                    }
                      break;
                  }
                }
              }
              break;
            }

            case 'Type': {
              const _type = this.currentScope.peek() as Type;
              if (_type.kind !== 'enum' &&
                _type.kind !== 'struct' &&
                (prevToken.tokenType === TokenType.colon || prevToken.tokenType === TokenType.comma)) {
                if (prevToken.tokenType === TokenType.colon && _type.extends.length !== 0) {
                  this.AddError(`Extending type ${_type.id} - found a colon when we already found one`);
                } else if (prevToken.tokenType === TokenType.comma && _type.extends.length === 0) {
                  this.AddError(`Extending type ${_type.id} - found a comma without a previous colon`);
                }
                _type.extends.push(currentContent);
                roleInContext = 'extends';
                break;
              } else if (tokenType === TokenType.identifier || tokenType === TokenType.type) {
                // a method / property declaration: MyType Foo { get; } or MyType Foo();
                if (_type.kind === 'enum') {
                  roleInContext = 'enumValue';
                } else {
                  roleInContext = 'returnType';
                }

                let kind: MemberKind = undefined;

                if (_type.kind === 'enum' || _type.kind === 'struct') {
                  kind = 'field';
                } else if (prevToken.tokenType === TokenType.keyword && prevContent === 'event') {
                  kind = 'event';
                }

                const member = new Member({
                  id: currentContent,
                  displayName: currentContent,
                  kind: kind,
                });
                _type.members.push(member);
                this.EnterNewScope(member);
              } else if (tokenType === TokenType.semicolon && _type.kind === 'delegate') {
                // delegates like `delegate D(X x);`
                this.ExitScope();
              }
              break;
            }

            case 'Member': {
              const member = this.currentScope.peek() as Member;
              if (tokenType === TokenType.identifier) {
                roleInContext = 'name';
                // fix up the Member and its return type
                if (member.returnType === undefined) {
                  member.returnType = member.displayName;
                  member.id = currentContent;
                  member.displayName = currentContent;
                } else {
                  this.AddError(`Found unexpected member ${member.id}`);
                }
              } else if (tokenType === TokenType.semicolon) {
                if (member.kind !== 'property') {
                  this.ExitScope();
                } else {
                  this.AddError(`Semicolon found after ${member.kind} ${member.displayName}`);
                }
              }
              break;
            }

            case 'ParameterScope': {
              const paramScope = this.currentScope.peek() as ParameterScope;

              if (tokenType === TokenType.identifier || tokenType === TokenType.type) {
                if (paramScope.params.length == 0 ||
                  last(paramScope.params).id !== undefined) {
                  const p = new Parameter({
                    paramType: currentContent,
                  });
                  roleInContext = 'returnType';
                  paramScope.params.push(p);
                } else {
                  const p = last(paramScope.params);
                  if (p.id === undefined && p.paramType) {
                    p.id = currentContent;
                    roleInContext = 'name';
                  } else {
                    this.AddError(`Parameter ${p.id} already has set type ${p.paramType}`);
                  }
                }
              }
              break;
            }

            case 'Property': {
              const propScope = this.currentScope.peek() as PropertyScope;
              const member = this.currentScope.peek(-1) as Member;

              switch (tokenType) {
                case TokenType.method: {
                  member.accessors.push(currentContent);
                  break
                }
                case TokenType.scopeToken: {
                  break;
                }
                case TokenType.semicolon: {
                  break;
                }
                default: {
                  this.AddError(`Property ${member.displayName} can only contain accessors`);
                }
              }
              break;
            }
          }
        }

        let context: Namespace | Type | Member | ParameterScope | undefined = undefined;
        if (this.currentScope.size() > 0) {
          switch (this.currentScope.peek().type) {
            case 'Namespace':
            case 'Type':
            case 'Member':
            case 'ParameterScope':
              context = this.currentScope.peek() as (Namespace | Type | Member | ParameterScope);
              break;
          }
        }

        const modifiers = t.modifier ? [t.modifier] : [];
        const newParsedToken: IParsedToken = {
          line: this.line,
          startCharacter: this.col,
          length: len,
          tokenType: tokenType,
          tokenModifiers: modifiers,
          startIndex: this.currentIdx,
          context: context,
          roleInContext: roleInContext,
        };
        this.uncommitted.push(newParsedToken);
        this.currentIdx += len;

        if (m[0].match(/(\r\n|\r|\n)/)) {
          this.line++;
          this.col = 0;
        } else {
          this.col += len;
        }
      }

    }


    if (this.currentScope.size() != 0) {
      this.AddError(`Unexpected end of file. Top of the scope stack: ${this.currentScope.peek().type}`, '');
    }

    this.RemapIdentifiers();
  }


  private EnterNewScope(scope: Scopeable) {
    this.currentScope.push(scope);
    this.flushUncommitted();
  }

  private flushUncommitted() {
    this.parsedTokens.push(...this.uncommitted);
    this.uncommitted = [];
  }

  private ExitScope() {
    this.flushUncommitted();
    return this.currentScope.pop();
  }

  private AddError(msg: string, token?: string) {
    this.errors.push({
      line: this.line,
      col: this.col,
      token: token ?? this.text[this.currentIdx],
      msg: msg,
    });
    return this.findSyncToken();
  }

  private RemapIdentifiers() {
    for (const entry of this.parsedTokens) {
      if (entry.context !== undefined) {
        if (entry.tokenType === TokenType.identifier) {
          const content = this.text.substr(entry.startIndex, entry.length);

          switch (entry.context.type) {
            case 'Namespace': {
              entry.tokenType = TokenType.namespace;
              break;
            }
            case 'Type': {
              const _type = entry.context as Type;
              switch (entry.roleInContext) {
                case 'extends':
                  entry.tokenType = this.GetTypeKindTokenType(content);
                  break;
                default:
                  entry.tokenType = MidlParser.GetTokenTypeForType(_type.kind);
                  break;
              }

              break;
            }
            case 'Member': {
              const member = entry.context as Member;
              switch (entry.roleInContext) {
                case 'returnType':
                  entry.tokenType = member.kind === 'ctor' ? TokenType.method : this.GetTypeKindTokenType(content);
                  break;
                case 'name':
                  entry.tokenType = MidlParser.GetTokenTypeForMember(member.kind);
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
            case 'ParameterScope': {
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
    }
  }

  private GetTypeKindTokenType(fullName: string): TokenType {
    const nsName = fullName.substring(0, fullName.lastIndexOf('.'));
    const name = fullName.substring(fullName.lastIndexOf('.') + 1);
    const ns = this.parsedModel.find(n => n.id === nsName);
    if (ns) {
      const _type = ns.types.find(t => t.id === name);
      if (_type) {
        return MidlParser.GetTokenTypeForType(_type.kind);
      }
    }

    return TokenType.type;
  }



}