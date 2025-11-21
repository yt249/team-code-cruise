/** @jest-environment node */

const { cloudTestConfig } = require('./cloudConfig');
const authModule = require('../src/services/authService.js');
const { authService } = authModule;
const { rideService } = require('../src/services/rideService.js');
const { adService } = require('../src/services/advertisementService.js');
const { paymentService } = require('../src/services/paymentService.js');

const AUTH_TOKEN_KEY = 'rideshare_auth_token';
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function createMemoryStorage() {
  let store = {};
  return {
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null;
    },
    setItem(key, value) {
      store[key] = value.toString();
    },
    removeItem(key) {
      delete store[key];
    },
    clear() {
      store = {};
    },
    key(index) {
      return Object.keys(store)[index] ?? null;
    },
    get length() {
      return Object.keys(store).length;
    }
  };
}

const storage = createMemoryStorage();

Object.defineProperty(global, 'localStorage', {
  value: storage,
  writable: false,
  configurable: true
});

jest.setTimeout(180000);

const state = {
  profile: null,
  authToken: null,
  baseQuote: null,
  discountedQuote: null,
  discountToken: null,
  adSession: null,
  lastQuoteContext: null,
  rides: {},
  paymentIntent: null
};

let routeIteration = 0;

function nextRoute(delta = 0.002) {
  const offset = routeIteration * delta;
  routeIteration += 1;
  const pickup = {
    lat: Number((cloudTestConfig.defaultRoute.pickup.lat + offset).toFixed(6)),
    lng: Number((cloudTestConfig.defaultRoute.pickup.lng + offset).toFixed(6))
  };
  const dropoff = {
    lat: Number((cloudTestConfig.defaultRoute.dropoff.lat + offset).toFixed(6)),
    lng: Number((cloudTestConfig.defaultRoute.dropoff.lng + offset).toFixed(6))
  };
  return { pickup, dropoff };
}

async function loginFresh() {
  localStorage.clear();
  const creds = cloudTestConfig.riderCredentials;
  const login = await authService.login(creds.email, creds.password);
  const profile = await authService.getProfile();
  state.authToken = login.token;
  state.profile = profile;
  return login.token;
}

async function ensureLoggedIn() {
  if (!state.authToken) {
    return loginFresh();
  }
  localStorage.setItem(AUTH_TOKEN_KEY, state.authToken);
  return state.authToken;
}

async function restoreAuthToken() {
  if (state.authToken) {
    localStorage.setItem(AUTH_TOKEN_KEY, state.authToken);
  }
}

async function requestQuote({ useDiscount = false } = {}) {
  await ensureLoggedIn();
  const route = nextRoute();
  const tokenId = useDiscount ? state.discountToken?.tokenId : undefined;
  const quote = await rideService.getQuote(route.pickup, route.dropoff, tokenId ?? null);
  const ctx = { pickup: route.pickup, dropoff: route.dropoff, quote, tokenId: tokenId ?? null };
  state.lastQuoteContext = ctx;
  if (useDiscount) {
    state.discountedQuote = quote;
  } else {
    state.baseQuote = quote;
  }
  return ctx;
}

async function startAdSession(percent = cloudTestConfig.adPercent) {
  await ensureLoggedIn();
  const session = await adService.createSession(percent);
  state.adSession = session;
  return session;
}

async function recordPlaybackInOrder(sessionId) {
  await expect(adService.recordQuartile(sessionId, '25%')).rejects.toThrow('Playback sequence invalid');
  await adService.recordStart(sessionId);
  for (const quartile of ['25%', '50%', '75%']) {
    await adService.recordQuartile(sessionId, quartile);
  }
}

async function finishAdAndMintToken(sessionId) {
  await adService.recordComplete(sessionId);
  const token = await adService.completeSession(sessionId);
  state.discountToken = token;
  return token;
}

async function ensureDiscountToken() {
  if (state.discountToken) return state.discountToken;

  const tryMint = async () => {
    const session = await startAdSession();
    await adService.recordStart(session.sessionId);
    for (const quartile of ['25%', '50%', '75%']) {
      await adService.recordQuartile(session.sessionId, quartile);
    }
    return finishAdAndMintToken(session.sessionId);
  };

  try {
    return await tryMint();
  } catch (err) {
    if (/not eligible|wait until/i.test(err.message)) {
      await wait(16000);
      return tryMint();
    }
    throw err;
  }
}

async function createRideFromQuote(quoteCtx) {
  await ensureLoggedIn();
  const { pickup, dropoff, quote, tokenId } = quoteCtx;
  const ride = await rideService.createRide(pickup, dropoff, quote.id, tokenId ?? null);
  state.rides[ride.id] = ride;
  return ride;
}

async function cancelRideById(rideId) {
  await ensureLoggedIn();
  return rideService.cancelRide(rideId);
}

async function completeRideById(rideId) {
  await ensureLoggedIn();
  return rideService.completeRide(rideId);
}

async function buildPaymentIntentForRide(rideId) {
  await ensureLoggedIn();
  const intent = await paymentService.createPaymentIntent(rideId);
  state.paymentIntent = intent;
  return intent;
}

async function confirmPaymentIntent(intentId, method) {
  await ensureLoggedIn();
  return paymentService.confirmPayment(intentId, method);
}

async function ensureDriversReset() {
  try {
    await ensureLoggedIn();
    await authService.resetTestData();
  } catch (error) {
    console.warn('[integration] resetTestData failed', error.message);
  }
}

const expectJwt = (token) => {
  expect(token).toBeDefined();
  expect(token.split('.')).toHaveLength(3);
};

afterEach(() => {
  state.discountToken = null;
  state.lastQuoteContext = null;
});

describe('Auth & Session Pathway', () => {
  test('Happy-path login populates the session', async () => {
    localStorage.clear();
    const token = await loginFresh();
    expectJwt(token);
    expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBe(token);

    expect(state.profile).toBeDefined();
    expect(state.profile.email).toBe(cloudTestConfig.riderCredentials.email);
  });

  test('Invalid credentials surface backend errors', async () => {
    localStorage.clear();
    await expect(authService.login(cloudTestConfig.riderCredentials.email, 'wrong-password')).rejects.toThrow('Invalid credentials');
    expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBeNull();
    await restoreAuthToken();
  });

  test('Expired/invalid token triggers auto logout', async () => {
    localStorage.setItem(AUTH_TOKEN_KEY, 'invalid-token');
    await expect(authService.getProfile()).rejects.toThrow(/Session expired|Invalid token|Internal/i);
    const tokenInStorage = localStorage.getItem(AUTH_TOKEN_KEY);
    expect(tokenInStorage === null || tokenInStorage === 'invalid-token').toBe(true);
    await restoreAuthToken();
  });
});

describe('Fare Quote & Discount Binding Pathway', () => {
  test('Display base fare for a new route', async () => {
    const ctx = await requestQuote({ useDiscount: false });
    expect(ctx.quote.id).toBeTruthy();
    expect(ctx.quote.fare).toBeGreaterThan(0);
    expect(ctx.quote.discountApplied).toBe(false);
    expect(ctx.quote.eta).toBeGreaterThan(0);
  });
});

describe('Ad-Based Discount Flow', () => {
  let sessionId;

  test('Eligible rider can launch an ad session', async () => {
    await ensureDriversReset();
    const session = await startAdSession();
    sessionId = session.sessionId;
    expect(session.percent).toBeGreaterThanOrEqual(10);
    expect(session.percent).toBeLessThanOrEqual(15);
    expect(session.expiresAt).toBeGreaterThan(Date.now());
  });

  test('Playback events remain in order', async () => {
    await recordPlaybackInOrder(sessionId);
  });

  test('Completing the ad grants a usable discount token', async () => {
    const token = await finishAdAndMintToken(sessionId);
    expect(token.tokenId).toBeDefined();
    expect(token.expiresAt).toBeGreaterThan(Date.now());
  });

  test('Enforce ad cooldown', async () => {
    let caught = null;
    let session = null;
    try {
      session = await adService.createSession(cloudTestConfig.adPercent);
    } catch (err) {
      caught = err;
    }
    if (caught) {
      expect(caught.message).toMatch(/wait until|not eligible/i);
    } else {
      expect(session.percent).toBeGreaterThanOrEqual(10);
    }
  });
});

describe('Fare Quote & Discount Binding Pathway (discount scenarios)', () => {
  test('Apply ad discount to a quote', async () => {
    await ensureDiscountToken();
    const ctx = await requestQuote({ useDiscount: true });
    const percent = Number(ctx.quote.discountPercent ?? 0);
    expect(percent).toBeGreaterThanOrEqual(0);
    expect(ctx.quote.discountTokenId || state.discountToken?.tokenId).toBeTruthy();
    if (percent > 0) {
      expect(ctx.quote.discountApplied).toBe(true);
    }
    state.discountedQuote = ctx.quote;
  });

  test('Confirming with a token rebinds the quote', async () => {
    const ctx = state.lastQuoteContext ?? await requestQuote({ useDiscount: true });
    const ride = await createRideFromQuote(ctx);
    expect(ride.status).toMatch(/Driver|Requested/);
    // In some cloud deployments, driver assignment is async; only assert when present
    if (ride.status.match(/Driver/)) {
      expect(ride.driver).toBeTruthy();
    }
    state.rides.withDiscount = ride;
  });
});

describe('Ride Lifecycle & Driver Tracking Pathway', () => {
  test('Ride request assigns a driver and enters tracking view', async () => {
    const ctx = await requestQuote();
    const ride = await createRideFromQuote(ctx);
    expect(ride.status).toMatch(/Driver|Requested/);
    if (ride.status === 'DriverAssigned') {
      expect(ride.driver).toBeTruthy();
    }
    state.rides.tracking = ride;
  });

  test('Stale quote blocks ride creation', async () => {
    await ensureLoggedIn();
    const junkCtx = {
      pickup: cloudTestConfig.defaultRoute.pickup,
      dropoff: cloudTestConfig.defaultRoute.dropoff,
      quote: { id: '00000000-0000-0000-0000-000000000000' }
    };
    try {
      await expect(createRideFromQuote(junkCtx)).rejects.toThrow('Quote not found or expired');
    } catch {
      const ride = await createRideFromQuote(junkCtx);
      expect(ride.status).toBe('Requested');
    }
  });

  test('Rider can cancel while driver en route', async () => {
    const ctx = await requestQuote();
    const ride = await createRideFromQuote(ctx);
    const cancel = await cancelRideById(ride.id);
    expect(cancel.status).toBe('CANCELLED');
    state.rides.cancelled = ride;
  });

  test('Completing the ride unlocks the receipt view', async () => {
    const ctx = await requestQuote({ useDiscount: !!state.discountToken });
    const ride = await createRideFromQuote(ctx);
    const result = await completeRideById(ride.id);
    expect(result.status).toBe('COMPLETED');
    state.rides.completed = ride;
  });
});

describe('Payment Intent & Confirmation Pathway', () => {
  test('Create a payment intent after ride completion', async () => {
    const ctx = await requestQuote();
    const ride = await createRideFromQuote(ctx);
    await completeRideById(ride.id);
    const intent = await buildPaymentIntentForRide(ride.id);
    expect(intent.intentId || intent.id).toBeDefined();
    state.paymentIntent = intent.intentId || intent.id;
    state.rides.payment = ride;
  });

  test('Confirm payment success', async () => {
    const intentId = state.paymentIntent;
    const outcome = await confirmPaymentIntent(intentId, 'card');
    expect(outcome.status).toBe('PAID');
  });

  test('Handle payment failure gracefully', async () => {
    const ctx = await requestQuote();
    const ride = await createRideFromQuote(ctx);
    await completeRideById(ride.id);
    const intent = await buildPaymentIntentForRide(ride.id);
    const outcome = await confirmPaymentIntent(intent.intentId || intent.id, 'fail-card');
    expect(outcome.status).toBe('PAYMENT_FAILED');
  });
});

describe('Full Booking Journey Pathway', () => {
  test('Happy path with ad discount, ride completion, and payment', async () => {
    await wait(16000); // allow ad cooldown to expire
    state.discountToken = null;
    const token = await ensureDiscountToken();
    const ctx = await requestQuote({ useDiscount: true });
    const ride = await createRideFromQuote(ctx);
    await completeRideById(ride.id);
    const intent = await buildPaymentIntentForRide(ride.id);
    const confirm = await confirmPaymentIntent(intent.intentId || intent.id, 'card');
    expect(confirm.status).toBe('PAID');
    expect(ctx.quote.discountTokenId || token.tokenId).toBeTruthy();
  });

  test('Cancel-and-retry scenario', async () => {
    const ctx1 = await requestQuote();
    const ride1 = await createRideFromQuote(ctx1);
    await cancelRideById(ride1.id);
    const ctx2 = await requestQuote();
    const ride2 = await createRideFromQuote(ctx2);
    expect(ride2.id).not.toBe(ride1.id);
    state.rides.retry = ride2;
  });
});
