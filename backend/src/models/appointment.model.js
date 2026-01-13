import mongoose from 'mongoose';
const Schema = mongoose.Schema;

const appointmentSchema = new Schema({
  patient_id: { type: Schema.Types.ObjectId, ref: 'Patient', required: true },
  doctor_id: { type: Schema.Types.ObjectId, ref: 'Employee' },
  appointment_date: Date,
  // appointment_date: {
  //   type: String,
  //   set: v => {
  //     if (!v) return v;
  //     const d = new Date(v);
  //     return d.toISOString().split('T')[0]; // yyyy-mm-dd
  //   }
  // },
  status: { type: String, enum: ['Scheduled', 'Completed', 'Cancelled'], default: 'Scheduled' },
  reason: String,
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
  disabled: { type: Boolean, default: false },
  }, {
  toJSON: {
    transform: (doc, ret) => {
      ret.appointment_date = ret.appointment_date ? ret.appointment_date.toISOString() : null;
      return ret;
    }
  }
});

export default mongoose.model('Appointment', appointmentSchema);