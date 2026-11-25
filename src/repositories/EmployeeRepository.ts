// 员工 repository
import { BaseRepository } from './BaseRepository';
import { COLLECTIONS } from '../storage/collections';
import type { StorageManager } from '../storage/StorageManager';
import type { Employee } from '../types';

export class EmployeeRepository extends BaseRepository<Employee> {
  constructor(sm: StorageManager) {
    super(sm, COLLECTIONS.employees);
  }

  async listByStructure(structureId: string): Promise<Employee[]> {
    return (await this.list()).filter((e) => e.structureId === structureId);
  }

  async listByDepartment(department: string): Promise<Employee[]> {
    return (await this.list()).filter((e) => e.department === department);
  }
}
