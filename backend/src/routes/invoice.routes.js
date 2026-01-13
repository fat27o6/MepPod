import express from 'express';
const router = express.Router();

import ctrl from '../controllers/invoice.controller.js';
import auth from '../../middleware/auth.middleware.js';
import validate from '../utils/validate.js';
import validator from '../validators/invoice.validator.js';

router.post('/', auth(["Admin", "Accountant", "Doctor"]), validator.createInvoice(), validate, ctrl.create);
router.post('/from-medical-record/:medicalRecordId', auth(["Admin", "Accountant", "Doctor"]), validator.createFromMedicalRecord(), validate, ctrl.createFromMedicalRecord);

router.get('/', auth(["Admin", "Accountant"]) , ctrl.findAll);
router.get('/patient/:id', auth(["Admin", "Accountant", "Doctor"]), ctrl.findByPatientId);
router.get('/:id', auth(["Admin", "Accountant", "Doctor"]), ctrl.findById);

router.put('/:id', auth(["Admin", "Accountant"]), validator.updateInvoice(), validate, ctrl.update);
router.delete('/:id', auth("Admin"), ctrl.remove);
router.put('/:id/restore', auth("Admin"), ctrl.restore);

export default router;