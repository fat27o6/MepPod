import express from 'express';
const router = express.Router();

import ctrl from '../controllers/payment.controller.js';
import auth from '../../middleware/auth.middleware.js';
import validate from '../utils/validate.js';
import validator from '../validators/payment.validator.js';

router.post('/', auth(["Admin", "Accountant"]), validator.createPayment(), validate, ctrl.create);

router.get('/', auth(["Admin", "Accountant"]), ctrl.findAll);
router.get('/invoice/:invoiceId', auth(["Admin", "Accountant"]), ctrl.findByInvoiceId);
router.get('/:id', auth(["Admin", "Accountant"]), ctrl.findById);

router.put('/:id', auth(["Admin", "Accountant"]), validator.updatePayment(), validate, ctrl.update);
router.delete('/:id', auth("Admin"), ctrl.remove);
router.put('/:id/restore', auth("Admin"), ctrl.restore);

export default router;