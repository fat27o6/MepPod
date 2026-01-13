import { body, param, query } from 'express-validator';

export default class NotificationValidator {
  static createNotification() {
    return [
      body('recipient_id').optional().isMongoId(),
      body('recipient_role').optional().isIn(['Admin', 'Doctor', 'Nurse', 'Receptionist', 'Accountant', 'Pharmacist']),
      body('type').isIn(['appointment_created', 'medical_record_created', 'invoice_created', 'payment_created', 'appointment_completed', 'schedule_updated']),
      body('title').isString().notEmpty(),
      body('message').isString().notEmpty(),
      body('related_id').optional().isMongoId(),
      body('related_type').optional().isString()
    ];
  }

  static getNotifications() {
    return [
      query('read').optional().isBoolean()
    ];
  }

  static markAsRead() {
    return [
      param('id').isMongoId()
    ];
  }
}