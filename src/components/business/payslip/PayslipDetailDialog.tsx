// 工资条明细弹窗：展示全部薪酬行与汇总，确认后锁定
import type { PaySlip, PaySlipStatus } from '../../../types';
import { formatMoney } from '../../../lib/format';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../ui/dialog';

const STATUS_LABEL: Record<PaySlipStatus, string> = {
  draft: '草稿',
  confirmed: '已确认',
  void: '已作废',
};

export function PayslipDetailDialog({
  slip,
  employeeName,
  open,
  onOpenChange,
  onConfirm,
  onVoid,
}: {
  slip: PaySlip | null;
  employeeName: string;
  open: boolean;
  onOpenChange: (open: boolean): void;
  onConfirm?(): void;
  onVoid?(): void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>{employeeName} 工资条</DialogTitle>
            {slip && <Badge variant="outline">{STATUS_LABEL[slip.status]}</Badge>}
          </div>
        </DialogHeader>

        {slip && (
          <div className="space-y-1.5">
            {slip.lines.map((line) => (
              <div
                key={line.componentId}
                className="flex justify-between text-sm"
              >
                <span className="text-muted-foreground">{line.name}</span>
                <span className="font-medium">{formatMoney(line.amount)}</span>
              </div>
            ))}
            <div className="mt-2 space-y-1.5 border-t pt-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">应发合计</span>
                <span>{formatMoney(slip.gross)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">扣除合计</span>
                <span>{formatMoney(slip.totalDeduction)}</span>
              </div>
              <div className="flex justify-between text-base font-semibold">
                <span>实发</span>
                <span className="text-primary">{formatMoney(slip.net)}</span>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          {slip?.status === 'draft' && (
            <Button variant="outline" onClick={onVoid}>
              作废
            </Button>
          )}
          {slip?.status === 'draft' && (
            <Button onClick={onConfirm}>确认锁定</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
