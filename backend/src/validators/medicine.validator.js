import { body, param } from 'express-validator';

export default class MedicineValidator {
  static createMedicine() {
    return [
      body('name').isString().notEmpty(),
      body('category').optional().isArray(),
      body('category.*').optional().isString(),
      body('unit').isString(),
      body('price').isFloat({ gt: 0 })
    ];
  }

  static updateMedicine() {
    return [
      param('id').isMongoId(),
      body('category').optional().isArray(),
      body('category.*').optional().isString(),
      body('price').optional().isFloat({ gt: 0 })
    ];
  }
}