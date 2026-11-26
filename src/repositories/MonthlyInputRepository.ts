// 月度外部输入 repository：按 年-月 分片，按员工 upsert 业绩/考勤/系数等
import type { MonthlyInput } from '../types';
import { COLLECTIONS, periodKey } from '../storage/collections';
import type { StorageManager } from '../storage/StorageManager';
import { uid } from '../lib/id';

export class MonthlyInputRepository {
  constructor(private readonly sm: StorageManager) {}

  private key(year: number, month: number): string {
    return periodKey(COLLECTIONS.monthlyInputs, year, month);
  }

  async listPeriod(year: number, month: number): Promise<MonthlyInput[]> {
    return (
      (await this.sm.getKey<MonthlyInput[]>(
        COLLECTIONS.monthlyInputs,
        this.key(year, month),
      )) ?? []
    );
  }

  async getForEmployee(
    year: number,
    month: number,
    employeeId: string,
  ): Promise<MonthlyInput | null> {
    return (
      (await this.listPeriod(year, month)).find(
        (x) => x.employeeId === employeeId,
      ) ?? null
    );
  }

  // 写入某员工当月输入：存在则合并 values，否则新建
  async upsert(
    year: number,
    month: number,
    schemeId: string,
    employeeId: string,
    values: Record<string, number>,
  ): Promise<MonthlyInput[]> {
    const list = await this.listPeriod(year, month);
    const now = Date.now();
    const idx = list.findIndex((x) => x.employeeId === employeeId);
    if (idx >= 0) {
      list[idx] = {
        ...list[idx],
        schemeId,
        values: { ...list[idx].values, ...values },
        updatedAt: now,
      };
    } else {
      list.push({
        id: uid(),
        schemeId,
        employeeId,
        year,
        month,
        values,
        createdAt: now,
        updatedAt: now,
        deleted: false,
        deletedAt: null,
      });
    }
    await this.sm.setKey(
      COLLECTIONS.monthlyInputs,
      this.key(year, month),
      list,
    );
    return list;
  }
}
