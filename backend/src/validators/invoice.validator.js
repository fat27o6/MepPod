import { body, param } from 'express-validator';

export default class InvoiceValidator {
  static createInvoice() {
    return [
      body('patient_id').isMongoId(),
      body('appointment_id').isMongoId(),
      body('total_amount').isFloat({ gt: 0 }),
      body('status').optional().isIn(['Unpaid', 'Paid', 'Partial'])
    ];
  }

  static updateInvoice() {
    return [
      param('id').isMongoId(),
      body('status').optional().isIn(['Unpaid', 'Paid', 'Partial'])
    ];
  }

  static createFromMedicalRecord() {
    return [
      param('medicalRecordId').isMongoId().withMessage('Medical record ID không hợp lệ')
    ];
  }
}