import mongoose from 'mongoose';
const Schema = mongoose.Schema;

const medicineSchema = new Schema({
  name: String,
  category: [String], // Array of categories
  unit: String,
  price: Number,
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
  disabled: { type: Boolean, default: false },
});

export default mongoose.model('Medicine', medicineSchema);