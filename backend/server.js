import dotenv from 'dotenv';
import app from './app.js';
import pool from './config/dbConfig.js';

// Initiate the enviroment variables
dotenv.config({ path: './env/.env' });

const PORT = process.env.PORT || 4999;

// Try conection before initiating the server
try {
  const client = await pool.connect();
  const res = await client.query("SELECT NOW()");
  console.log("🟢 Data Base Connected:", res.rows[0]);
  client.release();

  // Start the server after the conection is succesfull
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
} catch (err) {
  console.error("🔴 Error while trying to connect to the data base:", err.stack);
}
