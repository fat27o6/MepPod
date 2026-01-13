import { body, param } from 'express-validator';

export default class EmployeeValidator {
  static createEmployee() {
    return [
      body('fullname').isString().notEmpty(),
      body('dob').isISO8601().toDate(),
      body('gender').isIn(['Male', 'Female']),
      body('phone').optional().isMobilePhone(),
      body('email').optional().isEmail(),
      body('position').isString().notEmpty(),
      body('basic_salary').isFloat({ gt: 0 }).notEmpty(),
    ];
  }

  static updateEmployee() {
    return [
      param('id').isMongoId(),
      body('phone').optional().isMobilePhone(),
      body('email').optional().isEmail(),
      body('position').optional().isString(),
      body('basic_salary').optional().isFloat({ gt: 0 })
    ];
  }
}