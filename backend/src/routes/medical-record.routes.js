import express from 'express';
const router = express.Router();

import ctrl from '../controllers/medical-record.controller.js';
import auth from '../../middleware/auth.middleware.js';
import validate from '../utils/validate.js';
import validator from '../validators/medical-record.validator.js';

router.post('/', auth(["Admin", "Doctor"]), validator.createMedicalRecord(), validate, ctrl.create);

router.get('/', auth(["Admin", "Doctor", "Receptionist", "Nurse"]) , ctrl.findAll);
router.get('/patient/:id', auth(["Admin", "Doctor", "Receptionist", "Nurse"]), ctrl.findByPatientId);
router.get('/:id', auth(["Admin", "Doctor", "Receptionist", "Nurse"]), ctrl.findById);

router.put('/:id', auth(["Admin", "Doctor"]), validator.updateMedicalRecord(), validate, ctrl.update);
router.delete('/:id', auth(["Admin", "Doctor"]), ctrl.remove);
router.put('/:id/restore', auth("Admin"), ctrl.restore);

export default router;