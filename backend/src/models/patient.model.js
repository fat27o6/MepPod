import mongoose from 'mongoose';
const Schema = mongoose.Schema;

const historySchema = new Schema({
  khoa: { type: String },
  description: { type: String },
}, { _id: false });

const patientSchema = new Schema({
  fullname: { type: String, required: true },
  dob: { type: Date },
  gender: { type: String },
  phone: { type: String },
  address: { type: String },
  email: { type: String },
  medical_history: [historySchema],
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
  disabled: { type: Boolean, default: false },
});

export default mongoose.models.Patient || mongoose.model('Patient', patientSchema);