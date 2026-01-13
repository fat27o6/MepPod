import dotenv from "dotenv";
dotenv.config();

import connectDB from './src/config/db.js';
import app from './server.js';

async function main() {
  const port = process.env.PORT || 5050; // Default 5050 vì Mac thường conflict port 5000

  try {
    await connectDB();

    app.listen(port, '0.0.0.0', () => {
      console.log(`Server is running on port ${port}`)
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    throw err;
  }
}

main();