import express from 'express';
import cors from "cors";
import morgan from "morgan";

import lectureRoutes from "./routes/LectureRoutes.js";

const app = express();

// Middlewares
app.use(cors());
app.use(express.json()); // To parse JSON on petitions
app.use(morgan('dev')); // Logger of HTPP petitions

// Routes
app.use('/api/lectures', lectureRoutes);

export default app;
