import mongoose from 'mongoose';
const Schema = mongoose.Schema;

const payrollSchema = new Schema({
  employee_id: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
  basic_salary: Number,
  bonus: Number,
  deductions: Number,
  net_salary: Number,
  paydate: Date,
  accountant_id: { type: Schema.Types.ObjectId, ref: 'Employee' },
  emailSent: { type: Boolean, default: false },
  updated_at: { type: Date, default: Date.now },
  disabled: { type: Boolean, default: false },
});

export default mongoose.model('Payroll', payrollSchema);