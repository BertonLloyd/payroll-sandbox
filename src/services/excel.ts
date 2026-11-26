// Excel 导入导出：员工花名册、工资条导出，员工导入解析
import * as XLSX from 'xlsx';
import type { Employee, PaySlip, PaySlipStatus } from '../types';
import type { InputFieldSpec } from '../lib/inputFields';

const PAYSLIP_STATUS_LABEL: Record<PaySlipStatus, string> = {
  draft: '草稿',
  confirmed: '已确认',
  void: '已作废',
};

// 同一员工同一月去重；已确认优先于草稿
export function dedupeSlips(slips: PaySlip[]): PaySlip[] {
  const picked = new Map<string, string>();
  for (const slip of slips) {
    const key = `${slip.employeeId}-${slip.year}-${slip.month}`;
    const existing = picked.get(key);
    if (!existing) {
      picked.set(key, slip);
    } else if (existing.status !== 'confirmed' && slip.status === 'confirmed') {
      picked.set(key, slip);
    }
  }
  return [...picked.values()];
}

export function exportEmployeesExcel(employees: Employee[]): void {
  const rows = employees.map((e) => ({
    工号: e.empNo,
    姓名: e.name,
    部门: e.department,
    岗位: e.position,
    职级: e.level,
    入职日期: e.hireDate,
    状态: e.status,
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '员工花名册');
  XLSX.writeFile(wb, '员工花名册.xlsx');
}

export function exportPayslipsExcel(
  slips: PaySlip[],
  employees: Employee[],
): void {
  const rows = dedupeSlips(slips);
  const employeeMap = new Map(employees.map((e) => [e.id, e]));

  // 收集全部组件列：按首次出现顺序，记录 componentId 与显示名
  const componentOrder: string[] = [];
  const componentName = new Map<string, string>();
  for (const slip of rows) {
    for (const line of slip.lines) {
      if (!componentName.has(line.componentId)) {
        componentOrder.push(line.componentId);
        componentName.set(line.componentId, line.name);
      }
    }
  }

  const header = [
    '工号',
    '姓名',
    '部门',
    '岗位',
    '职级',
    '年月',
    ...componentOrder.map((id) => componentName.get(id)!),
    '应发合计',
    '扣除合计',
    '实发',
    '状态',
  ];

  const body = rows.map((slip) => {
    const employee = employeeMap.get(slip.employeeId);
    const amountByComponent = new Map(
      slip.lines.map((line) => [line.componentId, line.amount]),
    );
    return [
      employee?.empNo ?? '',
      employee?.name ?? slip.employeeId,
      employee?.department ?? '',
      employee?.position ?? '',
      employee?.level ?? '',
      `${slip.year}-${String(slip.month).padStart(2, '0')}`,
      ...componentOrder.map((id) => amountByComponent.get(id) ?? 0),
      slip.gross,
      slip.totalDeduction,
      slip.net,
      PAYSLIP_STATUS_LABEL[slip.status],
    ];
  });

  const ws = XLSX.utils.aoa_to_sheet([header, ...body]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '工资明细');
  XLSX.writeFile(wb, '工资条明细表.xlsx');
}

export interface ImportedEmployeeRow {
  工号?: string;
  姓名?: string;
  部门?: string;
  岗位?: string;
  职级?: string;
  入职日期?: string;
}

export function parseEmployeesExcel(file: File): Promise<ImportedEmployeeRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const wb = XLSX.read(reader.result, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        resolve(XLSX.utils.sheet_to_json(ws));
      } catch (e) {
        reject(e);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

// ===== 考勤模板下载与上传解析 =====

// 下载考勤模板：预填在职员工工号、姓名，考勤列留空
export function downloadAttendanceTemplate(
  employees: Employee[],
  attendanceFields: InputFieldSpec[],
): void {
  const header = ['工号', '姓名', ...attendanceFields.map((f) => f.label)];
  const body = employees.map((e) => [
    e.empNo,
    e.name,
    ...attendanceFields.map(() => ''),
  ]);
  const ws = XLSX.utils.aoa_to_sheet([header, ...body]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '考勤');
  XLSX.writeFile(wb, '考勤导入模板.xlsx');
}

// 解析考勤 Excel：返回原始行（键为表头，含工号/姓名/各考勤列）
export function parseAttendanceExcel(
  file: File,
): Promise<Record<string, unknown>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const wb = XLSX.read(reader.result, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        resolve(XLSX.utils.sheet_to_json(ws, { defval: '' }));
      } catch (e) {
        reject(e);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}
