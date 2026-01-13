import mongoose from 'mongoose';
const Schema = mongoose.Schema;

const notificationSchema = new Schema({
  recipient_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  recipient_role: { type: String, enum: ['Admin', 'Doctor', 'Nurse', 'Receptionist', 'Accountant', 'Pharmacist'], required: true },
  type: {
    type: String,
    enum: ['appointment_created', 'medical_record_created', 'invoice_created', 'payment_created', 'appointment_completed', 'schedule_updated'],
    required: true
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  related_id: { type: Schema.Types.ObjectId }, // ID của appointment, medical_record, invoice, ...
  related_type: { type: String }, // 'appointment', 'medical_record', 'invoice', ...
  read: { type: Boolean, default: false },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
  disabled: { type: Boolean, default: false },
}, {
  toJSON: {
    transform: (doc, ret) => {
      ret.created_at = ret.created_at ? ret.created_at.toISOString() : null;
      ret.updated_at = ret.updated_at ? ret.updated_at.toISOString() : null;
      return ret;
    }
  }
});

// Index để query nhanh hơn
notificationSchema.index({ recipient_id: 1, read: 1, disabled: 1 });
notificationSchema.index({ recipient_role: 1, read: 1, disabled: 1 });

export default mongoose.models.Notification || mongoose.model('Notification', notificationSchema);