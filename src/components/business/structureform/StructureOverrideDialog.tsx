// 结构级覆盖弹窗：同一组件在不同结构里可覆盖金额/比例等，不影响组件默认值
import { useEffect, useState } from 'react';
import type {
  CalcConfig,
  PayComponent,
  StructureItem,
} from '../../../types';
import { parseNumber } from '../../../lib/format';
import { Button } from '../../ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../ui/dialog';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';

export function StructureOverrideDialog({
  open,
  onOpenChange,
  component,
  item,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean): void;
  component: PayComponent;
  item: StructureItem;
  onSave(override: Partial<CalcConfig> | undefined): void;
}) {
  const [override, setOverride] = useState<Partial<CalcConfig> | undefined>(
    item.override,
  );

  useEffect(() => {
    if (open) setOverride(item.override);
  }, [open, item]);

  const base = component.calcConfig;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>结构级覆盖 · {component.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {base.kind === 'fixed' && (
            <div className="space-y-1.5">
              <Label>覆盖固定金额</Label>
              <Input
                type="number"
                value={
                  (override as Extract<CalcConfig, { kind: 'fixed' }>)
                    ?.amount ?? base.amount
                }
                onChange={(e) =>
                  setOverride({
                    kind: 'fixed',
                    amount: parseNumber(e.target.value),
                  })
                }
              />
            </div>
          )}

          {base.kind === 'ratio' && (
            <div className="space-y-1.5">
              <Label>覆盖比例（%）</Label>
              <Input
                type="number"
                value={
                  ((override as Extract<CalcConfig, { kind: 'ratio' }>)
                    ?.ratio ?? base.ratio) * 100
                }
                onChange={(e) =>
                  setOverride({
                    kind: 'ratio',
                    ratio: parseNumber(e.target.value) / 100,
                  })
                }
              />
            </div>
          )}

          {base.kind === 'external' && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>覆盖系数</Label>
                <Input
                  type="number"
                  value={
                    (override as Extract<CalcConfig, { kind: 'external' }>)
                      ?.coefficient ?? base.coefficient
                  }
                  onChange={(e) =>
                    setOverride({
                      kind: 'external',
                      coefficient: parseNumber(e.target.value),
                      fallback: base.fallback,
                    })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>覆盖缺省值</Label>
                <Input
                  type="number"
                  value={
                    (override as Extract<CalcConfig, { kind: 'external' }>)
                      ?.fallback ?? base.fallback
                  }
                  onChange={(e) =>
                    setOverride({
                      kind: 'external',
                      coefficient: base.coefficient,
                      fallback: parseNumber(e.target.value),
                    })
                  }
                />
              </div>
            </div>
          )}

          {base.kind === 'blocks' || base.kind === 'tiered' ? (
            <p className="text-sm text-muted-foreground">
              该计算方式的结构级覆盖请在组件层调整，或使用员工个人覆盖。
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onSave(undefined)}>
            清除覆盖
          </Button>
          <Button onClick={() => onSave(override)}>保存</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
