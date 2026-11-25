// 纯积木式公式 AST（递归），对应可视化积木编辑器，不暴露任何表达式输入

export type CompareOp = '>' | '>=' | '<' | '<=' | '==' | '!=';
export type LogicOp = 'and' | 'or';
export type MathOp = '+' | '-' | '*' | '/';

export interface RefNode {
  type: 'ref';
  refType: 'component' | 'input' | 'constant';
  componentId?: string;
  inputKey?: string;
  value?: number;
}

export interface CompareNode {
  type: 'compare';
  op: CompareOp;
  left: RefNode;
  right: RefNode | number;
}

export interface LogicNode {
  type: 'logic';
  op: LogicOp;
  operands: CompareNode[];
}

export interface MathNode {
  type: 'math';
  op: MathOp;
  operands: BlockNode[];
}

export interface ConditionNode {
  type: 'condition';
  branches: { when: LogicNode | CompareNode; then: BlockNode }[];
  else: BlockNode;
}

export type BlockNode =
  | ConditionNode
  | LogicNode
  | CompareNode
  | MathNode
  | RefNode;
