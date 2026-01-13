import { body, param } from 'express-validator';

export default class PayrollValidator {
  static createPayroll() {
    return [
      body('employee_id').isMongoId(),
      body('basic_salary').isFloat({ gt: 0 }),
      body('bonus').optional().isFloat(),
      body('deductions').optional().isFloat(),
      body('net_salary').optional().isFloat(),
      body('paydate').isISO8601().toDate(),
      body('accountant_id').optional().isMongoId()
    ];
  }

  static updatePayroll() {
    return [
      param('id').isMongoId(),
      body('bonus').optional().isFloat(),
      body('deductions').optional().isFloat()
    ];
  }
}