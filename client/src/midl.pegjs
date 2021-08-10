// MIDL 3 Grammar
// ==========================
// https://docs.microsoft.com/en-us/uwp/midl-3/
// https://github.com/asklar/midl_langserv


Program
  = prolog namespace*
  
prolog = _ ((import / preprocessorStatement / _ ) [\r\n])*

import = "import" _ stringLiteral _ ";" 

preprocessorStatement = (
  ("#import" _ stringLiteral _ ";") /
  ( "#ifdef" _ preprocessorExpression ) /
  ( "#ifndef" _ preprocessorExpression ) /
  ( "#if" _ preprocessorExpression) /
  ( "#endif") /
  ( "#define" _ identifier preprocessorExpression )
)

preprocessorExpression = [^\r\n]+

namespace = _ attrHeader _ "namespace" _ identifier _ "{" _ member* _ "}"

attrHeader = (attribute _?) *

attribute = "[" _ attrname:identifier _ attrCtor? _ "]" { return { attr: attrname }; }

attrCtor = "(" _ methodCallParams? _ ")"

methodCallParams = (methodCallParam _ "," _ methodCallParams) / methodCallParam 

identifier = [A-Za-z_][A-Za-z0-9_]* { return text(); }

member = _ attrHeader _ (classDecl / attrDecl / ifaceDecl / delegateDecl / enumDecl / structDecl)

methodCallParam = stringLiteral / integer / identifier

stringLiteral = '"' [^"]* '"'

comment = "//" [^\r\n]* {return ;}

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


