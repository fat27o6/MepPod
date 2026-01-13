import express from 'express';
import multer from 'multer';
const router = express.Router();

import ctrl from '../controllers/payroll.controller.js';
import auth from '../../middleware/auth.middleware.js';
import validate from '../utils/validate.js';
import validator from '../validators/payroll.validator.js';

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

router.post("/send/bulk", auth(["Admin", "Accountant"]), ctrl.sendPayrollBulk);
router.post("/send/:employee_id", auth(["Admin", "Accountant"]), ctrl.sendPayrollToEmployee);
router.post("/send/payroll/bulk", auth(["Admin", "Accountant"]), ctrl.sendPayrollBulkById);
router.post("/send/payroll/:payroll_id", auth(["Admin", "Accountant"]), ctrl.sendPayrollById);

router.post('/import', auth(["Admin", "Accountant"]), upload.single('file'), ctrl.import);
router.post('/', auth(["Admin", "Accountant"]), validator.createPayroll(), validate, ctrl.create);

router.get('/', auth(["Admin", "Accountant"]), ctrl.findAll);
router.get('/:id', auth(["Admin", "Accountant"]), ctrl.findById);

router.put('/:id', auth(["Admin", "Accountant"]), validator.updatePayroll(), validate, ctrl.update);
router.delete('/:id', auth(["Admin", "Accountant"]), ctrl.remove);
router.put('/:id/restore', auth("Admin"), ctrl.restore);

export default router;