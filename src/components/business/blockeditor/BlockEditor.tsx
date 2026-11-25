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
  onOpenChange: (open: boolean) => void;
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
        <NodeEditor value={value} components={components} onChange={onChange} />
      </DialogContent>
    </Dialog>
  );
}
