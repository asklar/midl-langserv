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
    text?: string
  }
  */

  function emit(tokenType, tokenModifiers) {
    const l = location();
    const token = {
      startIndex: l.start.offset,
      length: l.end.offset - l.start.offset,
      tokenType: tokenType,
      startCharacter: l.start.column - 1,
      line: l.start.line - 1,
      tokenModifiers: tokenModifiers !== undefined ? tokenModifiers : [],
      text: text()
    };

    if (options !== undefined && options.tokenList) {
      options.tokenList.push(token);
    }
    return token;
  }

}

start
  = prolog namespace*
  
prolog = (importStatement:import / preprocessorStatement / whitespace / comment )*

import "import" = importKeyword _ importFile _ ";" 
importFile = stringLiteral { return emit('import'); }
importKeyword = "import" { return emit('keyword'); }


 preprocessorStatement "preprocessor statement" = (
  ( includeKW _ includeReference ) /
  ( ifdefKW _ preprocessorExpression ) /
  ( ifndefKW _ preprocessorExpression ) /
  ( ifKW _ preprocessorExpression) /
  ( endifKW ) /
  ( defineKW _ identifier preprocessorExpression ) /
  ( undefKW _ identifier )
)

includeKW = "#include" { emit('preProcessor'); }
ifdefKW = "#ifdef" { emit('preProcessor'); }
ifndefKW = "#ifndef" { emit('preProcessor'); }
ifKW = "#if" { emit('preProcessor'); }
endifKW = "#endif" { emit('preProcessor'); }
defineKW = "#define" { emit('preProcessor'); }
undefKW = "#undef" { emit('preProcessor'); }

includeReference = (stringLiteral / ("<" [^>]+ ">")) { emit('file'); }

preprocessorExpression = [^\r\n]+

namespace = _ attrHeader _ namespaceKW _ namespaceName _ openBrace _ member* _ closeBrace _ tailTrivia*
namespaceKW = "namespace" { emit('keyword'); }
namespaceName "namespace name" = typeName { emit('namespace') }

attrHeader = (attribute _) *

attribute "attribute usage" = openBracket _ listOfAppliedAttrs closeBracket { return emit('attribute'); }
listOfAppliedAttrs = appliedAttr (_ "," _ appliedAttr)*
appliedAttr = attrname:identifier _ attrCtor? _ 
attrCtor = openParen _ methodCallParams? _ closeParen

methodCallParams = (methodCallParam _ "," _ methodCallParams) / methodCallParam 

identifier "identifier" = [A-Za-z_][A-Za-z0-9_]* { return text(); }

member = _ attrHeader _ (classDecl / attrDecl / ifaceDecl / delegateDecl / enumDecl / structDecl / apiContract) tailTrivia*

tailTrivia = whitespace / comment / ";"

methodCallParam "parameter" = stringLiteral / number / identifier

stringLiteral "string" = '"' [^"]* '"' { return emit('string'); }

comment "comment" = singleLineComment / multiLineComment

singleLineComment = "//" [^\r\n]* {return emit('comment');}
multiLineComment = "/*" (!"*/" .)* "*/" {return emit('comment');}

whitespace "whitespace" = [ \t\r\n]
_ "whitespaceOrComment"
  = (whitespace / comment)* {return ;} 
  
classDecl = staticKW?  _ unsealedKW? _ runtimeclassKW _ className _ ((extends? _ openBrace _ classMember* _ closeBrace) / ";")
staticKW = "static" { emit('keyword'); }
unsealedKW = "unsealed" { emit('keyword'); }
runtimeclassKW = "runtimeclass" { emit('keyword'); }
className "class name" = identifier { emit('class'); }

extends = ":" _ listOfExtendsTypes

/* ATTRIBUTE DECL */
attrDecl "attribute" = _ attributeKW _ attributeName _ ((openBrace _ fieldOrCtor* _ closeBrace) / ";")
attributeKW = "attributeKW" { emit('keyword'); }
attributeName "attribute name" = identifier { emit('attribute')}

/* INTERFACE DECL */
ifaceDecl = _ "interface" _ interfaceName _ ((requires? openBrace _ ifaceMember* _ closeBrace) / ";") 
interfaceName = identifier { emit('interface'); }

/* METHOD DECL */
ifaceMember = _ (methodDecl / property / event / field)
delegateDecl "delegate" = _ delegateKW _ methodSig _ ";"
delegateKW = "delegate" { emit('keyword'); }
methodDecl "method declaration" = _ attrHeader _ overridableKW? _ protectedKW? _ staticKW? _ methodSig _ ";"
overridableKW = "overridable" { emit('keyword'); }
protectedKW = "protected" { emit('keyword'); }

methodSig = retType _ methodName _ openParen _ methodDeclParams? _ closeParen _ 
methodName = identifier { emit('method'); }
methodDeclParams = methodDeclParam (_ "," _ methodDeclParams)*
methodDeclParam = attrHeader _ outKW? _ type _  parameterName
parameterName = identifier { emit('parameter'); }

outKW = "out" { emit('keyword'); }

/* EVENT DECL */
event "event" = _ attrHeader _ staticKW? _ eventKW _ retType _ eventName _ ";"
eventKW = "event" { emit('keyword'); }
eventName "event name"= identifier { emit('method'); }

/* ENUM DECL */
enumDecl = _ enumKW _ enumName _ ((openBrace _ enumValues _ closeBrace) / ";") 
enumKW = "enum" { emit('keyword'); }
enumName "enum name" = identifier { emit('enum'); }
enumValues = enumValue _ ("," _ enumValues)* ","?
enumValue = _ attrHeader _ enumValueBlock
enumValueBlock = enumValueDecl / (openBrace _ enumValues  _  closeBrace)
enumValueDecl = enumMemberName _ ("=" _ integer)?
enumMemberName "enum member name" = identifier { emit('enumMember'); }

/* STRUCT DECL */
structDecl "struct" = _ structKW _ structName _ ((openBrace _ field* _ closeBrace) / ";") 
structKW = "struct" { emit('keyword'); }
structName "struct name" = identifier { emit('struct'); }

field "field" = _ attrHeader _ staticKW? _ type _ fieldNameList  _ ";" 
fieldNameList = fieldName (_ "," _ fieldName)*
fieldName "field name" = identifier { emit('property')}

number = float / integer

integer "integer"
  = hex / decimal { emit('number'); }

float = integer (dot integer)? 
decimal = (_ "-"? _ [0-9]+ { return parseInt(text(), 10); })
hex = (_ "0x" [0-9A-Fa-f]+ {return parseInt(text(), 16); })

classMember = ifaceMember / ctor / scopeBlock

scopeBlock = _ attrHeader _ openBrace _ classMember* _ closeBrace 

fieldOrCtor = (field / ctor) _

ctor "constructor" = _ attrHeader _ ctorName _ openParen _ methodDeclParams? _ closeParen _ ";"
ctorName "ctor name" = identifier { emit('method'); }

requires = requiresKW _ listOfRequiresTypes
requiresKW = "requires" { emit('keyword'); }
listOfRequiresTypes "list of `requires` types" = (type _ "," _ listOfRequiresTypes) / type
listOfExtendsTypes "list of `extends` types" = attrHeader _ type (_ "," _ listOfExtendsTypes)*

retType = type / voidType { emit('type'); }
voidType = "void" 
type = typeName _ ("<" _ listOfGenericsTypes _ ">" )? _ arraySpec? { emit('type'); }
arraySpec = openBracket _ closeBracket
listOfGenericsTypes "list of generic type arguments" = (type _ "," _ listOfGenericsTypes) / type

typeName "type name" = ((!kw) identifier ".")* (!kw) identifier

property "property" = _ attrHeader _ staticKW? _ retType _ propertyName _ openBrace _ (accessor+)  closeBrace tailTrivia*
propertyName "property name" = identifier { emit('property'); }
accessor "accessor" = ("get" / "set") _ ";" _ { emit('method'); }

apiContract = apiContractKW _ apiContractName _ ((openBrace _ closeBrace) / ";") 
apiContractName = identifier { emit('type'); }
apiContractKW = "apicontract" { emit('keyword'); }

kw = eventKW ;

openBrace = "{"  { emit('punctuation'); }
closeBrace = "}" { emit('punctuation'); }
openParen = "("  { emit('punctuation'); }
closeParen = ")" { emit('punctuation'); }
openBracket = "["  { emit('punctuation'); }
closeBracket = "]" { emit('punctuation'); }
dot = "."
