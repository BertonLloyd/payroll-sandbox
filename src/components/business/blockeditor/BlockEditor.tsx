// 积木编辑器容器：弹窗包裹递归 NodeEditor
import type { BlockNode } from '../../../types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../../ui/dialog';
import { NodeEditor } from './NodeEditor';
import type { RefOption } from './RefEditor';

export function BlockEditor({
  open,
  onOpenChange,
  value,
  onChange,
  components,
  title,
}: {
  open: boolean;
  onOpenChange(open: boolean): void;
  value: BlockNode;
  onChange: (node: BlockNode) => void;
  components: RefOption[];
  title?: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title ?? '积木公式编辑'}</DialogTitle>
        </DialogHeader>
        <div className="rounded-md border border-border bg-muted/50 p-3 text-xs leading-relaxed text-muted-foreground">
          像搭积木一样拼出计算规则，全程点选、不用写代码。先选积木类型（引用、运算、比较、逻辑、条件），再逐层设置内容；
          「引用」可选取常量、其他组件或外部输入，「运算」支持加减乘除，「条件」可按判断结果取不同值。
        </div>
        <NodeEditor value={value} components={components} onChange={onChange} />
      </DialogContent>
    </Dialog>
  );
}
