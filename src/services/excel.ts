// Excel 导入导出：员工花名册、工资条导出，员工导入解析
import * as XLSX from 'xlsx';
import type { Employee, PaySlip } from '../types';

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
  nameOf: (employeeId: string) => string,
): void {
  const rows = slips.map((s) => ({
    姓名: nameOf(s.employeeId),
    年月: `${s.year}-${s.month}`,
    应发: s.gross,
    个税: s.tax,
    扣除合计: s.totalDeduction,
    实发: s.net,
    状态: s.status,
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '工资条');
  XLSX.writeFile(wb, '工资条汇总.xlsx');
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
