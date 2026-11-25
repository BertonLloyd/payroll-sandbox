// 引用节点编辑器：常量 / 组件 / 外部输入，全部点选，不出现表达式
import type { RefNode } from '../../../types';
import { Input } from '../../ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/select';
import { parseNumber } from '../../../lib/format';

export interface RefOption {
  id: string;
  name: string;
}

export function RefEditor({
  value,
  onChange,
  components,
}: {
  value: RefNode;
  onChange: (v: RefNode) => void;
  components: RefOption[];
}) {
  return (
    <div className="space-y-2">
      <Select
        value={value.refType}
        onValueChange={(t) => {
          if (t === 'constant')
            onChange({ type: 'ref', refType: 'constant', value: 0 });
          if (t === 'component')
            onChange({
              type: 'ref',
              refType: 'component',
              componentId: components[0]?.id,
            });
          if (t === 'input')
            onChange({ type: 'ref', refType: 'input', inputKey: '' });
        }}
      >
        <SelectTrigger className="h-8">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="constant">常量</SelectItem>
          <SelectItem value="component">引用组件</SelectItem>
          <SelectItem value="input">外部输入</SelectItem>
        </SelectContent>
      </Select>

      {value.refType === 'constant' && (
        <Input
          type="number"
          className="h-8"
          value={value.value ?? 0}
          onChange={(e) =>
            onChange({ ...value, value: parseNumber(e.target.value) })
          }
        />
      )}

      {value.refType === 'component' && (
        <Select
          value={value.componentId}
          onValueChange={(id) => onChange({ ...value, componentId: id })}
        >
          <SelectTrigger className="h-8">
            <SelectValue placeholder="选择组件" />
          </SelectTrigger>
          <SelectContent>
            {components.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {value.refType === 'input' && (
        <Input
          className="h-8"
          placeholder="输入字段 key，如 sales / performance"
          value={value.inputKey ?? ''}
          onChange={(e) => onChange({ ...value, inputKey: e.target.value })}
        />
      )}
    </div>
  );
}
