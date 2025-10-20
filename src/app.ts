import express from 'express';
import cors from 'cors';
import { initSchema } from './db.js';
import { router } from './routes.js';
import { DriversRepo } from './repositories.js';


initSchema();
DriversRepo.seed();


export const app = express();
app.use(cors());
app.use(express.json());
app.use('/api', router);