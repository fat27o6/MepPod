import { body, param } from 'express-validator';

export default class MedicalRecordValidator {
  static createMedicalRecord() {
    return [
      body('appointment_id')
        .optional({ checkFalsy: true, nullable: true })
        .custom((value) => {
          if (value === undefined || value === null || value === '') {
            return true; // Bỏ qua validation nếu không có giá trị
          }
          // Chỉ validate nếu có giá trị
          return /^[0-9a-fA-F]{24}$/.test(value);
        })
        .withMessage('appointment_id phải là MongoDB ObjectId hợp lệ'),
      body('patient_id').isMongoId().withMessage('patient_id phải là MongoDB ObjectId hợp lệ'),
      body('doctor_id').isMongoId().withMessage('doctor_id phải là MongoDB ObjectId hợp lệ'),
      body('diagnosis').isString().notEmpty().withMessage('Chẩn đoán không được để trống').matches(/^[\p{L}\s.'-]{2,100}$/u),
      body('treatment').optional().isString().matches(/^[\p{L}\s.'-]{2,100}$/u),
      body('notes').optional().isString().matches(/^[\p{L}\s.'-]{2,100}$/u),
      body('prescriptions').optional().isArray()
    ];
  }

  static updateMedicalRecord() {
    return [
      param('id').isMongoId(),
      body('diagnosis').optional().isString().matches(/^[\p{L}\s.'-]{2,100}$/u),
      body('treatment').optional().isString().matches(/^[\p{L}\s.'-]{2,100}$/u)
    ];
  }
}