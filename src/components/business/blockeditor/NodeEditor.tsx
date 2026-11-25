// 递归节点编辑器：统一处理五种 BlockNode，子节点递归引用自身
import { Plus, Trash2 } from 'lucide-react';
import type {
  BlockNode,
  CompareNode,
  CompareOp,
  LogicOp,
  MathOp,
  RefNode,
} from '../../../types';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/select';
import { parseNumber } from '../../../lib/format';
import { RefEditor, type RefOption } from './RefEditor';

const zeroRef: RefNode = { type: 'ref', refType: 'constant', value: 0 };

function defaultCompare(): CompareNode {
  return {
    type: 'compare',
    op: '>',
    left: zeroRef,
    right: 0,
  };
}

function defaultNode(type: BlockNode['type']): BlockNode {
  switch (type) {
    case 'ref':
      return zeroRef;
    case 'math':
      return { type: 'math', op: '+', operands: [zeroRef, zeroRef] };
    case 'compare':
      return defaultCompare();
    case 'logic':
      return { type: 'logic', op: 'and', operands: [defaultCompare()] };
    case 'condition':
      return {
        type: 'condition',
        branches: [{ when: defaultCompare(), then: zeroRef }],
        else: zeroRef,
      };
  }
}

const TYPE_LABELS: Record<BlockNode['type'], string> = {
  ref: '引用',
  math: '运算',
  compare: '比较',
  logic: '逻辑',
  condition: '条件',
};

export function NodeEditor({
  value,
  onChange,
  onRemove,
  components,
}: {
  value: BlockNode;
  onChange: (node: BlockNode) => void;
  onRemove?: () => void;
  components: RefOption[];
}) {
  return (
    <div className="space-y-2 rounded-md border border-border bg-card p-2.5">
      <div className="flex items-center gap-1.5">
        <Select
          value={value.type}
          onValueChange={(t) => onChange(defaultNode(t as BlockNode['type']))}
        >
          <SelectTrigger className="h-7 w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(TYPE_LABELS) as BlockNode['type'][]).map((t) => (
              <SelectItem key={t} value={t}>
                {TYPE_LABELS[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {onRemove && (
          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-muted-foreground"
            onClick={onRemove}
          >
            <Trash2 className="size-3.5" />
          </Button>
        )}
      </div>

      {value.type === 'ref' && (
        <RefEditor value={value} components={components} onChange={onChange} />
      )}

      {value.type === 'math' && (
        <div className="space-y-2">
          <Select
            value={value.op}
            onValueChange={(op) => onChange({ ...value, op: op as MathOp })}
          >
            <SelectTrigger className="h-8 w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {['+', '-', '*', '/'].map((op) => (
                <SelectItem key={op} value={op}>
                  {op}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {value.operands.map((operand, i) => (
            <NodeEditor
              key={i}
              value={operand}
              components={components}
              onChange={(node) =>
                onChange({
                  ...value,
                  operands: value.operands.map((o, j) => (j === i ? node : o)),
                })
              }
              onRemove={() =>
                onChange({
                  ...value,
                  operands: value.operands.filter((_, j) => j !== i),
                })
              }
            />
          ))}
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() =>
              onChange({ ...value, operands: [...value.operands, zeroRef] })
            }
          >
            <Plus className="size-3.5" /> 添加项
          </Button>
        </div>
      )}

      {value.type === 'compare' && (
        <div className="space-y-2">
          <Select
            value={value.op}
            onValueChange={(op) => onChange({ ...value, op: op as CompareOp })}
          >
            <SelectTrigger className="h-8 w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(['>', '>=', '<', '<=', '==', '!='] as CompareOp[]).map(
                (op) => (
                  <SelectItem key={op} value={op}>
                    {op}
                  </SelectItem>
                ),
              )}
            </SelectContent>
          </Select>
          <div>
            <p className="mb-1 text-xs text-muted-foreground">左值</p>
            <RefEditor
              value={value.left}
              components={components}
              onChange={(left) => onChange({ ...value, left })}
            />
          </div>
          <div>
            <p className="mb-1 text-xs text-muted-foreground">右值</p>
            {typeof value.right === 'number' ? (
              <div className="flex gap-1">
                <Input
                  type="number"
                  className="h-8"
                  value={value.right}
                  onChange={(e) =>
                    onChange({ ...value, right: parseNumber(e.target.value) })
                  }
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    onChange({ ...value, right: zeroRef })
                  }
                >
                  改引用
                </Button>
              </div>
            ) : (
              <div className="flex gap-1">
                <RefEditor
                  value={value.right}
                  components={components}
                  onChange={(right) => onChange({ ...value, right })}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onChange({ ...value, right: 0 })}
                >
                  改数字
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {value.type === 'logic' && (
        <div className="space-y-2">
          <Select
            value={value.op}
            onValueChange={(op) => onChange({ ...value, op: op as LogicOp })}
          >
            <SelectTrigger className="h-8 w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="and">并且 and</SelectItem>
              <SelectItem value="or">或者 or</SelectItem>
            </SelectContent>
          </Select>
          {value.operands.map((operand, i) => (
            <NodeEditor
              key={i}
              value={operand}
              components={components}
              onChange={(node) =>
                onChange({
                  ...value,
                  operands: value.operands.map((o, j) =>
                    j === i ? (node as CompareNode) : o,
                  ),
                })
              }
              onRemove={() =>
                onChange({
                  ...value,
                  operands: value.operands.filter((_, j) => j !== i),
                })
              }
            />
          ))}
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() =>
              onChange({
                ...value,
                operands: [...value.operands, defaultCompare()],
              })
            }
          >
            <Plus className="size-3.5" /> 添加条件
          </Button>
        </div>
      )}

      {value.type === 'condition' && (
        <div className="space-y-2">
          {value.branches.map((branch, i) => (
            <div
              key={i}
              className="space-y-2 rounded-md border border-dashed border-border p-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                  条件 {i + 1}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6 text-muted-foreground"
                  onClick={() =>
                    onChange({
                      ...value,
                      branches: value.branches.filter((_, j) => j !== i),
                    })
                  }
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
              <NodeEditor
                value={branch.when}
                components={components}
                onChange={(node) =>
                  onChange({
                    ...value,
                    branches: value.branches.map((b, j) =>
                      j === i ? { ...b, when: node as never } : b,
                    ),
                  })
                }
              />
              <NodeEditor
                value={branch.then}
                components={components}
                onChange={(node) =>
                  onChange({
                    ...value,
                    branches: value.branches.map((b, j) =>
                      j === i ? { ...b, then: node } : b,
                    ),
                  })
                }
              />
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() =>
              onChange({
                ...value,
                branches: [
                  ...value.branches,
                  { when: defaultCompare(), then: zeroRef },
                ],
              })
            }
          >
            <Plus className="size-3.5" /> 添加分支
          </Button>
          <div>
            <p className="mb-1 text-xs text-muted-foreground">其他情况</p>
            <NodeEditor
              value={value.else}
              components={components}
              onChange={(node) => onChange({ ...value, else: node })}
            />
          </div>
        </div>
      )}
    </div>
  );
}
