// 工资条 repository：按 年-月 分片存储；确认锁定、作废，不提供物理删除
import type { PaySlip } from '../types';
import { COLLECTIONS, periodKey } from '../storage/collections';
import type { StorageManager } from '../storage/StorageManager';

export class PaySlipRepository {
  constructor(private readonly sm: StorageManager) {}

  private key(year: number, month: number): string {
    return periodKey(COLLECTIONS.paySlips, year, month);
  }

  async listPeriod(year: number, month: number): Promise<PaySlip[]> {
    return (
      (await this.sm.getKey<PaySlip[]>(
        COLLECTIONS.paySlips,
        this.key(year, month),
      )) ?? []
    );
  }

  private async writePeriod(
    year: number,
    month: number,
    slips: PaySlip[],
  ): Promise<void> {
    await this.sm.setKey(
      COLLECTIONS.paySlips,
      this.key(year, month),
      slips,
    );
  }

  async replacePeriod(
    year: number,
    month: number,
    slips: PaySlip[],
  ): Promise<void> {
    await this.writePeriod(year, month, slips);
  }

  async getByEmployee(
    year: number,
    month: number,
    employeeId: string,
  ): Promise<PaySlip | null> {
    return (
      (await this.listPeriod(year, month)).find(
        (s) => s.employeeId === employeeId,
      ) ?? null
    );
  }

  // 确认后锁定：只允许 draft → confirmed
  async confirm(
    year: number,
    month: number,
    id: string,
  ): Promise<PaySlip[]> {
    const slips = await this.listPeriod(year, month);
    const next = slips.map((s) =>
      s.id === id && s.status === 'draft'
        ? { ...s, status: 'confirmed' as const, confirmedAt: Date.now() }
        : s,
    );
    await this.writePeriod(year, month, next);
    return next;
  }

  // 作废：confirmed/draft → void，保留记录
  async voidSlip(
    year: number,
    month: number,
    id: string,
  ): Promise<PaySlip[]> {
    const slips = await this.listPeriod(year, month);
    const next = slips.map((s) =>
      s.id === id && s.status !== 'void'
        ? { ...s, status: 'void' as const }
        : s,
    );
    await this.writePeriod(year, month, next);
    return next;
  }
}
