import express from 'express';
const router = express.Router();

import ctrl from '../controllers/appointment.controller.js';
import auth from '../../middleware/auth.middleware.js';
import validate from '../utils/validate.js';
import validator from '../validators/appointment.validator.js';

router.post('/', auth(["Admin", "Doctor", "Nurse", "Receptionist", "Patient"]), validator.createAppointment(), validate, ctrl.create);

router.get('/', auth(["Admin", "Receptionist", "Doctor", "Accountant", "Nurse"]), ctrl.findAll);
router.get('/:id', auth(["Admin", "Doctor", "Nurse", "Receptionist", "Accountant"]), ctrl.findById);
router.get('/doc/:id', auth(["Admin", "Doctor", "Receptionist", "Accountant"]), ctrl.findByDocId);
router.get('/patient/:id', auth(["Admin", "Doctor", "Nurse", "Receptionist", "Patient", "Accountant"]), ctrl.findByPatientId);

router.put('/:id', auth(["Admin", "Doctor", "Nurse", "Receptionist"]), validator.updateAppointment(), validate, ctrl.update);
router.delete('/:id', auth(["Admin", "Doctor", "Receptionist"]), ctrl.remove);
router.put('/:id/restore', auth("Admin"), ctrl.restore);

export default router;