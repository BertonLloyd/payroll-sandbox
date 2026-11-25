// 算薪引擎错误
export class PayrollEngineError extends Error {
  constructor(
    message: string,
    readonly code:
      | 'CYCLE_DETECTED'
      | 'MISSING_REF'
      | 'INVALID_FORMULA'
      | 'MISSING_INPUT'
      | 'BAD_CONFIG',
  ) {
    super(message);
    this.name = 'PayrollEngineError';
  }
}
