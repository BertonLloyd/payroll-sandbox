// 内置模板员工批量生成器：按"部门/岗位/职级/人数"槽位确定性生成，保证工号唯一、姓名不重复
import type { Employee } from '../../types';
import { makeEmployee } from '../entityFactory';

// 常见中文姓名池（60 个，互不重复），按顺序取用；模板员工数不超过 50
const NAME_POOL = [
  '王敏', '陈杰', '李娜', '张伟', '刘洋', '杨静', '黄强', '赵倩', '周涛', '吴磊',
  '徐丽', '孙浩', '朱琳', '马俊', '胡军', '郭欣', '何平', '林芳', '高翔', '罗艳',
  '郑凯', '梁霞', '谢明', '宋佳', '唐杰', '韩雪', '冯涛', '董洁', '萧然', '程鹏',
  '曹颖', '袁媛', '邓明', '许晴', '傅博', '沈毅', '曾毅', '彭越', '吕燕', '苏瑶',
  '卢杰', '蒋欣', '蔡明', '贾静', '丁宁', '魏明', '薛明', '叶明', '阎肃', '余文',
  '潘玮', '杜鹃', '戴明', '夏杰', '钟明', '汪明', '田芳', '任达', '姜涛', '范晓',
];

export interface EmployeeSlot {
  department: string;
  position: string;
  level: string;
  count: number;
}

interface GenerateOptions {
  idPrefix: string; // 实体 id 前缀，如 'gs'
  empNoPrefix: string; // 工号前缀，如 'GS'
  structureId: string;
  slots: EmployeeSlot[];
}

// 确定性入职日期：基于索引在 2020–2025 年间分布，不使用随机以保证每次一致
function hireDate(i: number): string {
  const year = 2020 + (i % 6);
  const month = ((i * 7) % 12) + 1;
  const day = ((i * 13) % 27) + 1;
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

export function generateEmployees(opts: GenerateOptions): Employee[] {
  const employees: Employee[] = [];
  let index = 0;

  for (const slot of opts.slots) {
    for (let k = 0; k < slot.count; k += 1) {
      const sequence = index + 1;
      employees.push(
        makeEmployee({
          id: `${opts.idPrefix}-emp-${sequence}`,
          empNo: `${opts.empNoPrefix}${String(sequence).padStart(3, '0')}`,
          name: NAME_POOL[index % NAME_POOL.length],
          department: slot.department,
          position: slot.position,
          level: slot.level,
          structureId: opts.structureId,
          hireDate: hireDate(index),
        }),
      );
      index += 1;
    }
  }

  return employees;
}
