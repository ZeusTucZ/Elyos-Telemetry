import express from 'express';
import cors from "cors";
import morgan from "morgan";

import lectureRoutes from "./routes/LectureRoutes.js";
import pilotRoutes from "./routes/PilotRoutes.js";
import configurationRoutes from "./routes/ConfigurationRoutes.js";
import sessionRoutes from "./routes/SessionRoutes.js";
import lapRoutes from "./routes/LapsRoutes.js";
import RecordRoutes from "./routes/RecordRoutes.js";
import authRoutes from "./routes/AuthRoutes.js";

const app = express();
const BASE_PATH = '/elyos-telemetry-backend';
const API_PREFIXES = ['/api', `${BASE_PATH}/api`];

// Middlewares
app.use(cors());
app.use(express.json()); // To parse JSON on petitions
app.use(morgan('dev')); // Logger of HTPP petitions

// Health endpoints for platform probes
app.get('/health', (_req, res) => {
  res.status(200).json({ ok: true });
});

app.get('/', (_req, res) => {
  res.status(200).send('OK');
});

// Support both direct "/api/*" and prefixed "/elyos-telemetry-backend/api/*" paths.
for (const prefix of API_PREFIXES) {
  app.use(`${prefix}/lectures`, lectureRoutes);
  app.use(`${prefix}/pilots`, pilotRoutes);
  app.use(`${prefix}/configurations`, configurationRoutes);
  app.use(`${prefix}/sessions`, sessionRoutes);
  app.use(`${prefix}/laps`, lapRoutes);
  app.use(`${prefix}/record`, RecordRoutes);
  app.use(`${prefix}/auth`, authRoutes);
}

export default app;
