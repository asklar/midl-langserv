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

namespace = _ attrHeader _ namespaceKW _ namespaceName _ "{" _ member* _ "}"
namespaceKW = "namespace" { emit('keyword'); }
namespaceName "namespace name" = identifier { emit('namespace') }

attrHeader = (attribute _) *

attribute "attribute usage" = "[" _ attrname:identifier _ attrCtor? _ "]" { return emit('attribute'); }

attrCtor = "(" _ methodCallParams? _ ")"

methodCallParams = (methodCallParam _ "," _ methodCallParams) / methodCallParam 

identifier "identifier" = [A-Za-z_][A-Za-z0-9_]* { return text(); }

member = _ attrHeader _ (classDecl / attrDecl / ifaceDecl / delegateDecl / enumDecl / structDecl)

methodCallParam "parameter" = stringLiteral / integer / identifier

stringLiteral "string" = '"' [^"]* '"' { return emit('string'); }

comment "comment" = singleLineComment / multiLineComment

singleLineComment = "//" [^\r\n]* {return emit('comment');}
multiLineComment = "/*" (!"*/" .)* "*/" {return emit('comment');}

whitespace "whitespace" = [ \t\r\n]
_ "whitespaceOrComment"
  = (whitespace / comment)* {return ;} 
  
classDecl = staticKW?  _ unsealedKW? _ runtimeclassKW _ className _ extends? _ "{" _ classMember* _ "}"
staticKW = "static" { emit('keyword'); }
unsealedKW = "unsealed" { emit('keyword'); }
runtimeclassKW = "runtimeclass" { emit('keyword'); }
className "class name" = identifier { emit('class'); }

extends = ":" _ listOfExtendsTypes

/* ATTRIBUTE DECL */
attrDecl "attribute" = _ attributeKW _ attributeName _ "{" _ fieldOrCtor* _ "}" _ ";"?
attributeKW = "attributeKW" { emit('keyword'); }
attributeName "attribute name" = identifier { emit('attribute')}

/* INTERFACE DECL */
ifaceDecl = _ "interface" _ interfaceName _ requires? "{" _ ifaceMember* _ "}"
interfaceName = identifier { emit('interface'); }

/* METHOD DECL */
ifaceMember = _ (methodDecl / property / event)
delegateDecl "delegate" = _ delegateKW _ methodSig _ ";"
delegateKW = "delegate" { emit('keyword'); }
methodDecl "method declaration" = _ attrHeader _ overridableKW? _ protectedKW? _ staticKW? _ methodSig _ ";"
overridableKW = "overridable" { emit('keyword'); }
protectedKW = "protected" { emit('keyword'); }

methodSig = retType _ methodName _ "(" _ methodDeclParams? _ ")" _ 
methodName = identifier { emit('method'); }
methodDeclParams = methodDeclParam (_ "," _ methodDeclParams)*
methodDeclParam = attrHeader _ type _ parameterName
parameterName = identifier { emit('parameter'); }

/* EVENT DECL */
event "event" = eventKW _ retType _ eventName _ ";"
eventKW = "event" { emit('keyword'); }
eventName "event name"= identifier { emit('method'); }

/* ENUM DECL */
enumDecl = _ enumKW _ enumName _ "{" _ enumValues _ "}" _ ";"?
enumKW = "enum" { emit('keyword'); }
enumName "enum name" = identifier { emit('enum'); }
enumValues = (enumValue _ "," _ enumValues) / (enumValue _ ","?)
enumValue = enumMemberName _ ("=" _ integer)?
enumMemberName "enum member name" = identifier { emit('enumMember'); }

/* STRUCT DECL */
structDecl "struct" = _ structKW _ structName _ "{" _ field* _ "}"
structKW = "struct" { emit('keyword'); }
structName "struct name" = identifier { emit('struct'); }

field "field" = attrHeader _ type _ fieldName  _ ";" 
fieldName "field name" = identifier { emit('property')}

integer "integer"
  = hex / decimal { emit('number'); }
  
decimal = (_ "-"? _ [0-9]+ { return parseInt(text(), 10); })
hex = (_ "0x" [0-9A-Fa-f]+ {return parseInt(text(), 16); })

classMember = ifaceMember / field / ctor / scopeBlock

scopeBlock = _ attrHeader _ "{" _ classMember* _ "}" 

fieldOrCtor = (field / ctor) _

ctor "constructor" = _ attrHeader _ ctorName _ "(" _ methodDeclParams? _ ")" _ ";"
ctorName "ctor name" = identifier { emit('method'); }

requires = requiresKW _ listOfRequiresTypes
requiresKW = "requires" { emit('keyword'); }
listOfRequiresTypes "list of `requires` types" = (type _ "," _ listOfRequiresTypes) / type
listOfExtendsTypes "list of `extends` types" = (type _ "," _ listOfExtendsTypes) / type

retType = type / voidType { emit('type'); }
voidType = "void" 
type = typeName _ ("<" _ listOfGenericsTypes _ ">" )? _ "[]"? { emit('type'); }
listOfGenericsTypes "list of generic type arguments" = (type _ "," _ listOfGenericsTypes) / type

typeName "type name" = ((!kw) identifier ".")* (!kw) identifier

property "property" = _ attrHeader _ staticKW? _ retType _ propertyName _ "{" _ (accessor+)  "}" _ ";"?
propertyName "property name" = identifier { emit('property'); }
accessor "accessor" = ("get" / "set") _ ";" _ { emit('method'); }


kw = eventKW ;