import mongoose from 'mongoose';
const { Schema } = mongoose;

const employeeSchema = new Schema({
  fullname: { type: String, required: true },
  dob: { type: Date },
  gender: { type: String },
  phone: { type: String },
  address: { type: String },
  email: { type: String, unique: true },
  position: { type: String },
  specialization: { type: String },
  basic_salary: Number,
  shift_schedule: { type: Schema.Types.Mixed }, // keep as mixed
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
  disabled: { type: Boolean, default: false },
}, {
  toJSON: {
    transform: (doc, ret) => {
      const formatDate = (d) => d ? d.toISOString().split('T')[0] : null;
      ret.dob = formatDate(ret.dob);
      // ret.created_at = formatDate(ret.created_at);
      // ret.updated_at = formatDate(ret.updated_at);
      return ret;
    }
  }
});

export default mongoose.models.Employee || mongoose.model('Employee', employeeSchema);