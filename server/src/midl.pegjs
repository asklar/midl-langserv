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

  function emit(tokenType, tokenModifiers, data, _text) {
    const t = _text ? _text : text();
    const l = location();

    const token = {
      startIndex: l.start.offset,
      length: l.end.offset - l.start.offset,
      tokenType: tokenType,
      startCharacter: l.start.column - 1,
      line: l.start.line - 1,
      tokenModifiers: tokenModifiers !== undefined ? tokenModifiers : [],
      text: t,
      data: data,
    };

    if (options !== undefined && options.tokenList) {
      options.tokenList.push(token);
    }
    return token;
  }

}

start
  = namespace*

import "import" = importKeyword _ importFile _ ";" 
importFile = stringLiteral { return emit('import'); }
importKeyword = "import" { return emit('keyword'); }


 preprocessorStatement "preprocessor statement" = (
  ( includeKW _ includeReference ) /
  ( ifdefKW _ preprocessorExpression ) /
  ( ifndefKW _ preprocessorExpression ) /
  ( elifKW _ preprocessorExpression ) /
  ( ifKW _ preprocessorExpression) /
  ( elseKW ) /
  ( endifKW ) /
  ( defineKW _ identifier preprocessorExpression ) /
  ( undefKW _ identifier )
)

includeKW = "#include" { emit('preProcessor'); }
ifdefKW = "#ifdef" { emit('preProcessor'); }
ifndefKW = "#ifndef" { emit('preProcessor'); }
elifKW = "#elif" { emit('preProcessor'); }
ifKW = "#if" { emit('preProcessor'); }
elseKW = "#else" { emit('preProcessor'); }
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

methodCallParams = methodCallParam _ ("," _ methodCallParam)*

identifier "identifier" = [A-Za-z_][A-Za-z0-9_]* { return text(); }

member = _ (typedef/(attrHeader _ (classDecl / attrDecl / ifaceDecl / delegateDecl / enumDecl / structDecl / apiContract) / namespace)) tailTrivia*

tailTrivia = whitespace / comment / ";"

methodCallParam "parameter" = stringLiteral / number / namespacedIdentifier

stringLiteral "string" = '"' [^"]* '"' { return emit('string'); }

comment "comment" = singleLineComment / multiLineComment

singleLineComment = "//" [^\r\n]* {return emit('comment');}
multiLineComment = "/*" (!"*/" .)* "*/" {return emit('comment');}

whitespace "whitespace" = [ \t\r\n]
_ "whitespaceOrComment"
  = (import / preprocessorStatement / whitespace / comment)* {return ;} 
  
classDecl = staticKW?  _ unsealedKW? _ runtimeclassKW _ className _ ((extends? _ openBrace _ classMember* _ closeBrace) / ";")
staticKW = "static" { return emit('keyword'); }
unsealedKW = "unsealed" { return emit('keyword'); }
runtimeclassKW = "runtimeclass" { return emit('keyword'); }
className "class name" = identifier { return emit('class'); }

extends = ":" _ listOfExtendsTypes

/* ATTRIBUTE DECL */
attrDecl "attribute" = _ attributeKW _ attributeName _ ((openBrace _ fieldOrCtor* _ closeBrace) / ";")
attributeKW = "attributeKW" { return emit('keyword'); }
attributeName "attribute name" = identifier { return emit('attribute')}

/* INTERFACE DECL */
ifaceDecl = _ "interface" _ interfaceName _ ((extends? _ requires? _ openBrace _ ifaceMember* _ closeBrace) / ";") 
interfaceName = identifier { return emit('interface'); }

/* METHOD DECL */
ifaceMember = _ (methodDecl / property / event / field)
delegateDecl "delegate" = _ delegateKW _ methodSig _ ";"
delegateKW = "delegate" { return emit('keyword'); }
methodDecl "method declaration" = _ attrHeader _ overridableKW? _ protectedKW? _ staticKW? _ methodSig _ ";"
overridableKW = "overridable" { return emit('keyword'); }
protectedKW = "protected" { return emit('keyword'); }

methodSig = retType _ methodName _ openParen _ methodDeclParams? _ closeParen _ 
methodName = identifier { return emit('method'); }
methodDeclParams = methodDeclParam (_ "," _ methodDeclParams)*
methodDeclParam = attrHeader _ outRefKW? _ type _  parameterName
parameterName = identifier { return emit('parameter'); }

outRefKW = ("out" / "ref") { return emit('keyword'); }

/* EVENT DECL */
event "event" = _ attrHeader _ staticKW? _ eventKW _ retType _ eventName _ ";"
eventKW = "event" { return emit('keyword'); }
eventName "event name"= identifier { return emit('method'); }

/* ENUM DECL */
enumDecl = _ enumKW _ enumName _ ((openBrace _ enumValues _ closeBrace) / ";") 
enumKW = "enum" { return emit('keyword'); }
enumName "enum name" = identifier { return emit('enum'); }
enumValues = enumValue _ ("," _ enumValues)* ","?
enumValue = _ attrHeader _ enumValueBlock
enumValueBlock = enumValueDecl / (openBrace _ enumValues  _  closeBrace)
enumValueDecl = enumMemberName _ ("=" _ integer)?
enumMemberName "enum member name" = identifier { return emit('enumMember'); }

/* STRUCT DECL */
structDecl "struct" = _ structKW _ structName _ ((openBrace _ field* _ closeBrace) / ";") 
structKW = "struct" { return emit('keyword'); }
structName "struct name" = identifier { return emit('struct'); }

field "field" = _ attrHeader _ staticKW? _ type _ fieldNameList  _ ";" 
fieldNameList = fieldName (_ "," _ fieldName)*
fieldName "field name" = identifier { return emit('property')}

number = float / integer

integer "integer"
  = hex / decimal { return emit('number'); }

float = integer (dot integer)? 
decimal = (_ "-"? _ [0-9]+ { return parseInt(text(), 10); })
hex = (_ "0x" [0-9A-Fa-f]+ {return parseInt(text(), 16); })

classMember = ifaceMember / ctor / scopeBlock

scopeBlock = _ attrHeader _ openBrace _ classMember* _ closeBrace 

fieldOrCtor = (field / ctor) _

ctor "constructor" = _ attrHeader _ protectedKW? _ ctorName _ openParen _ methodDeclParams? _ closeParen _ ";"
ctorName "ctor name" = identifier { return emit('method'); }

requires = requiresKW _ listOfRequiresTypes
requiresKW = "requires" { return emit('keyword'); }
listOfRequiresTypes "list of `requires` types" = type (_ "," _ type)*
listOfExtendsTypes "list of `extends` types" = attrHeader _ type (_ "," _ listOfExtendsTypes)*

retType = T:type { return emit('type', [], T); } / voidType { return emit('type', []); }
voidType = "void" 
type = TN:typeName _ ("<" _ listOfGenericsTypes _ ">" )? arraySpec? { return emit('type', [], TN); }
arraySpec = _ openBracket _ closeBracket
listOfGenericsTypes "list of generic type arguments" = (type _ "," _ listOfGenericsTypes) / type

typeName "type name" = ((!voidType) namespacedIdentifier) { return emit('typename'); }
namespacedIdentifier = ((!kw) identifier ".")* (!kw) identifier

property "property" = _ attrHeader _ O:overridableKW? _ S:staticKW? _ 
                      RETTYPE:retType _ PN:propertyName _ 
                      openBrace _ A:(accessor+)  closeBrace tailTrivia* { 
                        return emit('property', [O, S], {retType: RETTYPE, accessors: A}, PN);
                      }

propertyName "property name" = identifier 
accessor "accessor" = A:("get" / "set") _ ";" _ { return emit('method', [], A); }

apiContract = apiContractKW _ apiContractName _ ((openBrace _ closeBrace) / ";") 
apiContractName = identifier { return emit('type'); }
apiContractKW = "apicontract" { return emit('keyword'); }

kw = eventKW ;

openBrace = "{"  { emit('punctuation'); }
closeBrace = "}" { emit('punctuation'); }
openParen = "("  { emit('punctuation'); }
closeParen = ")" { emit('punctuation'); }
openBracket = "["  { emit('punctuation'); }
closeBracket = "]" { emit('punctuation'); }
dot = "."

typedef = typedefKW _ type _ (!kw) typedefName _ ";"
typedefKW = "typedef" { return emit("keyword"); }
typedefName = identifier { return emit("type"); }