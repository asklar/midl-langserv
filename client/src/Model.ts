import { TokenType } from './TokenType';


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

export type ElementType = 'Namespace' | 'Type' | 'Member' | 'ParameterScope' | 'Parameter' | 'Property';

export class Parameter {
  readonly type: ElementType;
  paramType: string;
  id: string = undefined;

  public constructor(p: {paramType?: string}) {
    this.type = 'Parameter';
    this.paramType = p.paramType;
  }
};

export class ParameterScope {
  readonly type: ElementType;
  params: Parameter[] = [];

  public constructor() {
    this.type = 'ParameterScope';
  }
};

export class PropertyScope {
  readonly type: ElementType;
  public constructor() {
    this.type = 'Property';
  }
};

export type MemberKind = 'method' | 'ctor' | 'event' | 'property' | 'field' | undefined;
export class Member  {
  readonly type: ElementType;
  id: string;
  displayName: string;
  kind: MemberKind;
  returnType?: string;
  paramScope?: ParameterScope;
  accessors?: string[];
  public constructor(p: { id?: string, displayName?: string, kind?: MemberKind, paramScope?: ParameterScope }) {
    this.type = 'Member';
    this.id = p.id;
    this.displayName = p.displayName;
    this.kind = p.kind;
    this.paramScope = p.paramScope;
  }
};

export type TypeKind = 'runtimeclass' | 'interface' | 'enum' | 'delegate' | 'struct' | undefined;
export class Type {
  readonly type: ElementType;
  id: string;
  kind: TypeKind;
  members: Member[] = [];
  extends: string[] = [];

  public constructor(p: {id?: string, kind?: TypeKind}) {
    this.type = 'Type';
    this.id = p.id;
    this.kind = p.kind;
  }
};
export class Namespace {
  readonly type: ElementType;
  id: string;
  types: Type[] = [];
  public constructor(p : {id: string}) {
    this.type = 'Namespace';
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
