export const TokenTypes = [
  'comment', 'string', 'keyword', 'number', 'regexp', 'operator', 'namespace',
  'type', 'struct', 'class', 'interface', 'enum', 'typeParameter', 'function',
  'method', 'macro', 'variable', 'parameter', 'property', 'label',
  'preProcessor',
  'attribute',
  'identifier',
  'scopeToken',
  'semicolon',
  'colon',
  'comma',
  'enumMember',
  'import',
  'file',
];

export type TokenType = typeof TokenTypes[number];

export enum TokenType_old {
  comment, string, keyword, number, regexp, operator, namespace,
  type, struct, class, interface, enum, typeParameter, function,
  method, macro, variable, parameter, property, label,
  preProcessor,
  attribute,
  identifier,
  scopeToken,
  semicolon,
  colon,
  comma,
  enumMember,
  import
}
