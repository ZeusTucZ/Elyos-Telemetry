import express from 'express';
import cors from "cors";
import morgan from "morgan";

import lectureRoutes from "./routes/LectureRoutes.js";
import pilotRoutes from "./routes/PilotRoutes.js";
import configurationRoutes from "./routes/ConfigurationRoutes.js";
import sessionRoutes from "./routes/SessionRoutes.js";

const app = express();

// Middlewares
app.use(cors());
app.use(express.json()); // To parse JSON on petitions
app.use(morgan('dev')); // Logger of HTPP petitions

// Routes
app.use('/api/lectures', lectureRoutes);
app.use('/api/pilots', pilotRoutes);
app.use('/api/configurations', configurationRoutes);
app.use('/api/sessions', sessionRoutes);

export default app;
