// Lambda initialization - runs once per container cold start
import { isMemoryMode } from '../src/workbench/runtimeConfig.js'
import { initMemoryDb } from '../src/workbench/memoryDb.js'

let initialized = false

export function initLambda() {
  if (initialized) return

  console.log('Initializing Lambda environment...')

  // Initialize memory DB if in memory mode
  if (isMemoryMode()) {
    console.log('Running in memory mode - initializing in-memory database')
    initMemoryDb()
  }

  initialized = true
  console.log('Lambda initialization complete')
}

// Auto-initialize on module load (cold start)
initLambda()
