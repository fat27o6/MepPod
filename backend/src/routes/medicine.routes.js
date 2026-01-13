import express from 'express';
import multer from 'multer';
const router = express.Router();

import ctrl from '../controllers/medicine.controller.js';
import auth from '../../middleware/auth.middleware.js';
import validate from '../utils/validate.js';
import validator from '../validators/medicine.validator.js';

// Kế thừa
// Cấu hình multer để xử lý file upload (lưu trong memory)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv' // .csv
    ];
    if (allowedMimes.includes(file.mimetype) || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Định dạng file không được hỗ trợ. Chỉ chấp nhận file Excel (.xlsx, .xls) hoặc CSV (.csv)'));
    }
  }
});
//

router.post('/', auth(["Admin", "Accountant", "Pharmacist"]), validator.createMedicine(), validate, ctrl.create);
router.post('/import', auth(["Admin", "Accountant", "Pharmacist"]), upload.single('file'), ctrl.import);

router.get('/', auth(['Admin', 'Doctor', 'Nurse', 'Receptionist', 'Accountant', 'Pharmacist']), ctrl.findAll);
router.get('/:id', auth(['Admin', 'Doctor', 'Nurse', 'Receptionist', 'Accountant', 'Pharmacist']), ctrl.findById);

router.put('/:id', auth(["Admin", "Accountant", "Pharmacist"]), validator.updateMedicine(), validate, ctrl.update);
router.delete('/:id', auth("Admin"), ctrl.remove);
router.put('/:id/restore', auth("Admin"), ctrl.restore);
router.post('/bulk-delete', auth("Admin"), ctrl.bulkDelete);

export default router;