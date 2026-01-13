import dotenv from 'dotenv';
import http from 'http';
import { Server } from 'socket.io';
import app from './app.js';
import pool from './config/dbConfig.js';

dotenv.config({ path: './env/.env' });

const PORT = process.env.PORT || 4999;

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

io.on("connection", (socket) => {
  console.log(`📱 Devices connected: ${socket.id}`);

  socket.on("comando-admin", (data) => {
    console.log("Order received from admin:", data.accion);
    io.emit("ejecutar-accion", data);
  });

  socket.on("disconnect", () => {
    console.log("📱 Device desconnected");
  });
});

try {
  const client = await pool.connect();
  const res = await client.query("SELECT NOW()");
  console.log("🟢 Data Base Connected:", res.rows[0]);
  client.release();

  // 4. IMPORTANTE: Usar server.listen en lugar de app.listen
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
} catch (err) {
  console.error("🔴 Error while trying to connect to the data base:", err.stack);
}