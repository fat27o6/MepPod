import { body, param } from 'express-validator';

export default class AppointmentValidator {
  static createAppointment() {
    return [
      body('patient_id').isMongoId(),
      body('doctor_id').isMongoId(),
      body('appointment_date').isISO8601().toDate(),
      body('status').optional().isIn(['Scheduled', 'Completed', 'Cancelled']),
      body('reason').optional().isString().matches(/^[\p{L}\s.'-]{2,100}$/u)
    ];
  }

  static updateAppointment() {
    return [
      param('id').isMongoId(),
      body('status').optional().isIn(['Scheduled', 'Completed', 'Cancelled'])
    ];
  }
}