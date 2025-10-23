type EligibilityState = {
  lastCompletedAt: Date | null
  cooldownEndsAt: Date | null
  dailyCount: number
  dailyKey: string | null
}

const riderState = new Map<string, EligibilityState>()

const COOLDOWN_MS = 5 * 1000
const DAILY_CAP = 5

export type EligibilityResult = {
  isEligible: boolean
  cooldownEndsAt?: Date
}

function resolveState(riderId: string): EligibilityState {
  let state = riderState.get(riderId)
  if (!state) {
    state = {
      lastCompletedAt: null,
      cooldownEndsAt: null,
      dailyCount: 0,
      dailyKey: null
    }
    riderState.set(riderId, state)
  }
  return state
}

function currentDayKey() {
  const now = new Date()
  return `${now.getUTCFullYear()}-${now.getUTCMonth() + 1}-${now.getUTCDate()}`
}

export class EligibilityService {
  static async checkRider(riderId: string): Promise<EligibilityResult> {
    const state = resolveState(riderId)
    this.refreshDailyBucket(state)
    if (state.cooldownEndsAt && state.cooldownEndsAt.getTime() > Date.now()) {
      return { isEligible: false, cooldownEndsAt: state.cooldownEndsAt }
    }
    if (state.dailyCount >= DAILY_CAP) {
      const nextDay = this.nextDayStart()
      state.cooldownEndsAt = nextDay
      return { isEligible: false, cooldownEndsAt: nextDay }
    }
    return { isEligible: true }
  }

  static async cooldownExpiresAt(riderId: string): Promise<Date | null> {
    const state = resolveState(riderId)
    return state.cooldownEndsAt ?? null
  }

  static registerCompletion(riderId: string, completedAt = new Date()) {
    const state = resolveState(riderId)
    this.refreshDailyBucket(state)
    state.lastCompletedAt = completedAt
    state.cooldownEndsAt = new Date(completedAt.getTime() + COOLDOWN_MS)
    state.dailyCount += 1
  }

  static clear(riderId?: string) {
    if (!riderId) riderState.clear()
    else riderState.delete(riderId)
  }

  private static refreshDailyBucket(state: EligibilityState) {
    const key = currentDayKey()
    if (state.dailyKey !== key) {
      state.dailyKey = key
      state.dailyCount = 0
    }
  }

  private static nextDayStart() {
    const now = new Date()
    const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1))
    return next
  }
}
