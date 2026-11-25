// 回收站：列出软删实体，支持还原与彻底删除
import { useEffect, useMemo, useState } from 'react';
import { RotateCcw, Trash2 } from 'lucide-react';
import { getRepositories } from '@/repositories/factory';
import type { AuditFields } from '@/types';
import { Button } from '../../ui/button';
import { formatDate } from '@/lib/format';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/select';

type NamedEntity = AuditFields & { name: string };

export function RecycleBin({ onChange }: { onChange(): void }) {
  const repos = useMemo(() => getRepositories(), []);
  const [type, setType] = useState<'components' | 'structures' | 'employees'>(
    'components',
  );
  const [tick, setTick] = useState(0);

  const repo = repos[type] as {
    listWithDeleted(): Promise<NamedEntity[]>;
    restore(id: string): Promise<unknown>;
    hardDelete(id: string): Promise<void>;
  };

  const [items, setItems] = useState<NamedEntity[]>([]);

  useEffect(() => {
    repo.listWithDeleted().then((all) =>
      setItems(all.filter((x) => x.deleted)),
    );
  }, [repo, tick, type]);

  return (
    <div className="space-y-3">
      <Select value={type} onValueChange={(v) => setType(v as never)}>
        <SelectTrigger className="w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="components">组件</SelectItem>
          <SelectItem value="structures">结构</SelectItem>
          <SelectItem value="employees">员工</SelectItem>
        </SelectContent>
      </Select>

      {items.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          回收站为空
        </p>
      ) : (
        <div className="space-y-1.5">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm"
            >
              <span className="flex-1 font-medium">{item.name}</span>
              <span className="text-xs text-muted-foreground">
                删除于 {item.deletedAt ? formatDate(item.deletedAt) : '—'}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  await repo.restore(item.id);
                  setTick((t) => t + 1);
                  onChange();
                }}
              >
                <RotateCcw className="size-3.5" /> 还原
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                onClick={async () => {
                  await repo.hardDelete(item.id);
                  setTick((t) => t + 1);
                }}
              >
                <Trash2 className="size-3.5" /> 彻底删除
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
