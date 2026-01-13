import { body, param } from 'express-validator';

export default class PatientValidator {
  static createPatient() {
    return [
      body('fullname').isString().notEmpty(),
      body('dob').isISO8601().toDate(),
      body('gender').isIn(['Male', 'Female']),
      body('phone').optional().isMobilePhone(),
    ];
  }

  static updatePatient() {
    return [
      param('id').isMongoId(),
      body('fullname').optional().isString(),
      body('dob').optional().isISO8601().toDate(),
      body('gender').optional().isIn(['Male', 'Female']),
      body('phone').optional().isMobilePhone(),
      body('email').optional().isEmail()
    ];
  }
}