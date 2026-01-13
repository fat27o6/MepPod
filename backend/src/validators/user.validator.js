import { body, param } from 'express-validator';

export default class UserValidator {
  static createUser() {
    return [
      body('username').isString().notEmpty(),
      body('password').optional().isString(),
      body('role')
        .optional()
        .isIn(['Admin', 'Doctor', 'Nurse', 'Receptionist', 'Accountant']),
      body('employee_id').optional().isMongoId(),
      body('patient_id').optional().isMongoId()
    ];
  }

  static updateUser() {
    return [
      param('id').isMongoId(),
      body('role')
        .optional()
        .isIn(['Admin', 'Doctor', 'Nurse', 'Receptionist', 'Accountant']),
      body('employee_id').optional().isMongoId(),
      body('patient_id').optional().isMongoId()
    ];
  }
}