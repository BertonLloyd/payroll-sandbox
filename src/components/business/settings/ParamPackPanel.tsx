// 参数包面板：可编辑起征点、个税税率档位、社保/公积金比例与基数上下限，保存后即时生效
import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { usePayroll } from '@/store';
import type { InsuranceItem, TaxParamPack, TierBracket } from '@/types';
import { parseNumber } from '@/lib/format';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../ui/table';
import { toast } from 'sonner';

export function ParamPackPanel() {
  const { paramPacks, paramPackOps } = usePayroll();
  const [draft, setDraft] = useState<TaxParamPack | null>(null);

  useEffect(() => {
    const target = paramPacks.find((p) => p.isDefault) ?? paramPacks[0];
    setDraft(target ? structuredClone(target) : null);
  }, [paramPacks]);

  if (!draft) {
    return (
      <p className="text-sm text-muted-foreground">暂无参数包</p>
    );
  }

  function updateInsurance(index: number, patch: Partial<InsuranceItem>) {
    setDraft((d) => {
      if (!d) return d;
      const social = d.social.map((it, i) =>
        i === index ? { ...it, ...patch } : it,
      );
      return { ...d, social };
    });
  }

  function updateBracket(index: number, patch: Partial<TierBracket>) {
    setDraft((d) => {
      if (!d) return d;
      const brackets = d.tax.brackets.map((b, i) =>
        i === index ? { ...b, ...patch } : b,
      );
      return { ...d, tax: { ...d, brackets } };
    });
  }

  function setBrackets(brackets: TierBracket[]) {
    setDraft((d) => (d ? { ...d, tax: { ...d, brackets } } : d));
  }

  const allInsurance = [...draft.social, draft.fund];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>参数包名称</Label>
          <Input
            value={draft.name}
            onChange={(e) =>
              setDraft((d) => (d ? { ...d, name: e.target.value } : d))
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label>个税起征点</Label>
          <Input
            type="number"
            value={draft.tax.threshold}
            onChange={(e) =>
              setDraft((d) =>
                d
                  ? {
                      ...d,
                      tax: {
                        ...d.tax,
                        threshold: parseNumber(e.target.value),
                      },
                    }
                  : d,
              )
            }
          />
        </div>
      </div>

      {/* 个税税率档位 */}
      <div className="space-y-1.5">
        <Label>个税税率档位（应纳税所得额上限 / 税率% / 速算扣除）</Label>
        {draft.tax.brackets.map((b, i) => (
          <div key={i} className="flex gap-1.5">
            <Input
              type="number"
              placeholder={Number.isFinite(b.upTo) ? '上限' : '封顶'}
              value={Number.isFinite(b.upTo) ? b.upTo : ''}
              onChange={(e) => {
                if (e.target.value === '')
                  updateBracket(i, { upTo: Number.POSITIVE_INFINITY });
                else updateBracket(i, { upTo: parseNumber(e.target.value) });
              }}
            />
            <Input
              type="number"
              placeholder="税率%"
              value={b.rate * 100}
              onChange={(e) =>
                updateBracket(i, { rate: parseNumber(e.target.value) / 100 })
              }
            />
            <Input
              type="number"
              placeholder="速算扣除"
              value={b.deduct ?? 0}
              onChange={(e) =>
                updateBracket(i, { deduct: parseNumber(e.target.value) })
              }
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() =>
                setBrackets(draft.tax.brackets.filter((_, j) => j !== i))
              }
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() =>
            setBrackets([
              ...draft.tax.brackets,
              { upTo: 0, rate: 0, deduct: 0 },
            ])
          }
        >
          <Plus className="size-3.5" /> 添加税率档位
        </Button>
        <p className="text-xs text-muted-foreground">
          上限填该档应纳税所得额最高值，最高一档留空表示封顶；税率按百分比填写，速算扣除没有则填 0。
        </p>
      </div>

      <div className="space-y-1.5">
        <Label>社保 / 公积金（比例按百分比填写）</Label>
        <div className="overflow-x-auto">
          <Table className="min-w-[560px]">
            <TableHeader>
              <TableRow>
                <TableHead>项目</TableHead>
                <TableHead>单位比例%</TableHead>
                <TableHead>个人比例%</TableHead>
                <TableHead>基数下限</TableHead>
                <TableHead>基数上限</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allInsurance.map((it, i) => {
                const isFund = i === draft.social.length;
                return (
                  <TableRow key={it.name}>
                    <TableCell className="font-medium">{it.name}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        className="h-8 w-24"
                        value={it.employerRate * 100}
                        onChange={(e) => {
                          const v = parseNumber(e.target.value) / 100;
                          if (isFund)
                            setDraft((d) =>
                              d ? { ...d, fund: { ...d.fund, employerRate: v } } : d,
                            );
                          else updateInsurance(i, { employerRate: v });
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        className="h-8 w-24"
                        value={it.employeeRate * 100}
                        onChange={(e) => {
                          const v = parseNumber(e.target.value) / 100;
                          if (isFund)
                            setDraft((d) =>
                              d ? { ...d, fund: { ...d.fund, employeeRate: v } } : d,
                            );
                          else updateInsurance(i, { employeeRate: v });
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        className="h-8 w-24"
                        value={it.baseMin}
                        onChange={(e) => {
                          const v = parseNumber(e.target.value);
                          if (isFund)
                            setDraft((d) =>
                              d ? { ...d, fund: { ...d.fund, baseMin: v } } : d,
                            );
                          else updateInsurance(i, { baseMin: v });
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        className="h-8 w-24"
                        value={it.baseMax}
                        onChange={(e) => {
                          const v = parseNumber(e.target.value);
                          if (isFund)
                            setDraft((d) =>
                              d ? { ...d, fund: { ...d.fund, baseMax: v } } : d,
                            );
                          else updateInsurance(i, { baseMax: v });
                        }}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      <Button
        onClick={async () => {
          await paramPackOps.update(draft.id, {
            name: draft.name,
            tax: draft.tax,
            social: draft.social,
            fund: draft.fund,
          });
          toast.success('参数包已保存，后续算薪即时生效');
        }}
      >
        保存参数
      </Button>
    </div>
  );
}
