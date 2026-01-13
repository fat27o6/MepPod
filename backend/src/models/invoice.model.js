import mongoose from 'mongoose';
const Schema = mongoose.Schema;

const invoiceSchema = new Schema({
  patient_id: { type: Schema.Types.ObjectId, ref: 'Patient' },
  appointment_id: { type: Schema.Types.ObjectId, ref: 'Appointment' },
  total_amount: Number,
  status: { type: String, enum: ['Unpaid','Paid','Partial'], default: 'Unpaid' },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
  disabled: { type: Boolean, default: false },
});

export default mongoose.model('Invoice', invoiceSchema);