// MIDL 3 Grammar
// ==========================
// https://docs.microsoft.com/en-us/uwp/midl-3/
// https://github.com/asklar/midl_langserv


{
  /*
  export interface IParsedToken {
    line: number;
    startCharacter: number;
    length: number;
    tokenType: TokenType; //string;
    tokenModifiers: string[];
    startIndex: number;
    context?: Namespace | Type | Member | ParameterScope;
    roleInContext?: ContextRole;
  }
  */

  function emit(tokenType, tokenModifiers) {
    const l = location();
    const token = {
      startIndex: l.start.offset,
      length: l.end.offset - l.start.offset + 1,
      tokenType: tokenType,
      startCharacter: l.start.column - 1,
      line: l.start.line - 1,
      tokenModifiers: tokenModifiers !== undefined ? tokenModifiers : [],
    };

    options.tokenList.push(token);
    return token;
  }

}

Program
  = prolog namespace*
  
prolog = _ ((importStatement:import / preprocessorStatement / _ ) [\r\n])*

import = importKeyword _ stringLiteral _ ";" 
importKeyword = "import" { return emit('import'); }


 preprocessorStatement = (
  ( "#include" _ stringLiteralOrBetweenGtLt _ ) /
  ( "#ifdef" _ preprocessorExpression ) /
  ( "#ifndef" _ preprocessorExpression ) /
  ( "#if" _ preprocessorExpression) /
  ( "#endif" _) /
  ( "#define" _ identifier preprocessorExpression )
)

stringLiteralOrBetweenGtLt = stringLiteral / ("<" [^>]+ ">")

preprocessorExpression = [^\r\n]+

namespace = _ attrHeader _ namespaceKeyword _ identifier _ "{" _ member* _ "}"
namespaceKeyword = "namespace" { emit('namespace'); }

attrHeader = (attribute _?) *

attribute = "[" _ attrname:identifier _ attrCtor? _ "]" { return emit('attribute'); }

attrCtor = "(" _ methodCallParams? _ ")"

methodCallParams = (methodCallParam _ "," _ methodCallParams) / methodCallParam 

identifier = [A-Za-z_][A-Za-z0-9_]* { return emit('identifier'); }

member = _ attrHeader _ (classDecl / attrDecl / ifaceDecl / delegateDecl / enumDecl / structDecl)

methodCallParam = stringLiteral / integer / identifier

stringLiteral = '"' [^"]* '"' { return emit('string'); }

comment = singleLineComment / multiLineComment

singleLineComment = "//" [^\r\n]* {return emit('comment');}
multiLineComment = "/*" (!"*/" .)* "*/" {return emit('comment');}

whitespace = [ \t\r\n]
_ "whitespaceOrComment"
  = (whitespace / comment)* {return ;} 
  
classDecl = "static"? _ "unsealed"? _ "runtimeclass" _ identifier _ extends? _ "{" _ classMember* _ "}"
extends = ":" _ listOfTypes

attrDecl = _ "attribute" _ identifier _ "{" _ fieldOrCtor* _ "}" _ ";"?
ifaceDecl = _ "interface" _ identifier _ requires? "{" _ methodDeclOrProperty* _ "}"
methodDeclOrProperty = _ (methodDecl / property)
delegateDecl = _ "delegate" _ methodSig _ ";"
methodDecl = _ attrHeader _ "overridable"? _ "protected"? _ "static"? _ methodSig _ ";"
methodSig = retType _ identifier _ "(" _ methodDeclParams? _ ")" _ 
methodDeclParams = methodDeclParam (_ "," _ methodDeclParams)*
methodDeclParam = attrHeader _ type _ identifier
enumDecl = _ "enum" _ identifier _ "{" _ enumValues _ "}" _ ";"?
enumValues = (enumValue _ "," _ enumValues) / (enumValue _ ","?)
enumValue = identifier _ ("=" _ integer)?

structDecl = _ "struct" _ identifier _ "{" _ field* _ "}"

field = attrHeader _ type _ identifier _ ";" 


integer "integer"
  = hex / decimal
  
decimal = (_ "-"? _ [0-9]+ { return parseInt(text(), 10); })
hex = (_ "0x" [0-9A-Fa-f]+ {return parseInt(text(), 16); })

classMember = methodDecl / field / property / ctor / scopeBlock

scopeBlock = _ attrHeader _ "{" _ classMember* _ "}" 

fieldOrCtor = (field / ctor) _

ctor = _ attrHeader _ identifier _ "(" _ methodDeclParams _ ")" _ ";"

requires = "requires" _ listOfTypes


retType = type / "void" 
type = typeName _ ("<" _ listOfTypes _ ">" )? _ "[]"?
listOfTypes = (type _ "," _ listOfTypes) / type
typeName = (identifier ".")* identifier

property = _ attrHeader _ "static"? retType _ identifier _ "{" _ accessor+ _ "}" _ ";"?
accessor = ("get" / "set") _ ";"


