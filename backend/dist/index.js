import dotenv from 'dotenv';
import { app } from './server/app.js';
import { isMemoryMode } from './workbench/runtimeConfig.js';
import { initMemoryDb } from './workbench/memoryDb.js';
import { RideTimeoutService } from './core/ride-timeout.service.js';
dotenv.config();
if (isMemoryMode()) {
    initMemoryDb();
    // Start ride timeout monitoring
    RideTimeoutService.start();
}
const PORT = Number(process.env.PORT || 3000);
app.listen(PORT, () => {
});
