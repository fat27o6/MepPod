import mongoose from 'mongoose';
const Schema = mongoose.Schema;

const paymentSchema = new Schema({
  invoice_id: { type: Schema.Types.ObjectId, ref: 'Invoice' },
  method: String,
  amount: Number,
  date: Date,
  updated_at: { type: Date, default: Date.now },
  disabled: { type: Boolean, default: false },
});

export default mongoose.model('Payment', paymentSchema);