import { TokenType } from './TokenType';


export interface IParsedToken {
  line: number;
  startCharacter: number;
  length: number;
  tokenType: TokenType;
  tokenModifiers: string[];
  startIndex: number;
  context?: Namespace | Type | Member | ParameterScope;
  roleInContext?: ContextRole;
}

export type ElementType = 'Namespace' | 'Type' | 'Member' | 'ParameterScope' | 'Parameter' | 'Property';

export class Element {
  readonly type: ElementType;
  tokens: IParsedToken[] = [];
  protected constructor(type: ElementType) {
    this.type = type;
  }
}
export class Parameter extends Element {
  paramType: string;
  id: string = undefined;

  public constructor(p: {paramType?: string}) {
    super('Parameter');
    this.paramType = p.paramType;
  }
};

export class ParameterScope extends Element {
  params: Parameter[] = [];

  public constructor() {
    super('ParameterScope');
  }
};

export class PropertyScope extends Element {
  public constructor() {
    super('Property');
  }
};

export type MemberKind = 'method' | 'ctor' | 'event' | 'property' | 'field' | undefined;
export class Member extends Element {
  id: string;
  displayName: string;
  kind: MemberKind;
  returnType?: string;
  paramScope?: ParameterScope;
  accessors?: string[];
  public constructor(p: { id?: string, displayName?: string, kind?: MemberKind, paramScope?: ParameterScope }) {
    super('Member');
    this.id = p.id;
    this.displayName = p.displayName;
    this.kind = p.kind;
    this.paramScope = p.paramScope;
  }
};

export type TypeKind = 'runtimeclass' | 'interface' | 'enum' | 'delegate' | 'struct' | undefined;
export class Type extends Element {
  id: string;
  kind: TypeKind;
  members: Member[] = [];
  extends: string[] = [];

  public constructor(p: {id?: string, kind?: TypeKind}) {
    super('Type');
    this.id = p.id;
    this.kind = p.kind;
  }
};
export class Namespace extends Element {
  id: string;
  types: Type[] = [];
  public constructor(p : {id: string}) {
    super('Namespace');
    this.id = p.id;
  }
};

export type ParseError = {
  line: number;
  col: number;
  token: string;
  msg: string;
};

export type ContextRole = 'name' | 'returnType' | 'enumValue' | 'extends';
export type Scopeable = Namespace | Type | Member | ParameterScope | Parameter | PropertyScope;
