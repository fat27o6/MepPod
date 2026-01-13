import { body, param } from 'express-validator';

export default class MedicineImportValidator {
  static createMedicineImport() {
    return [
      body('medicine_id').isMongoId(),
      body('supplier').isString(),
      body('batchcode').isString(),
      body('quantity').isInt({ gt: 0 }),
      body('unit_price').isFloat({ gt: 0 }),
      body('expiry_date').isISO8601().toDate(),
      body('import_date').isISO8601().toDate(),
      body('imported_by').isMongoId()
    ];
  }

  static updateMedicineImport() {
    return [
      param('id').isMongoId(),
      body('remaining').optional().isInt({ min: 0 })
    ];
  }
}