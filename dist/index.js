import dotenv from 'dotenv';
import { app } from './server/app.js';
import { isMemoryMode } from './workbench/runtimeConfig.js';
import { initMemoryDb } from './workbench/memoryDb.js';
dotenv.config();
if (isMemoryMode()) {
    initMemoryDb();
    console.log('[RB] Memory data mode enabled with seeded records');
}
const PORT = Number(process.env.PORT || 3000);
app.listen(PORT, () => {
    console.log(`[RB] API listening on http://localhost:${PORT}`);
});
