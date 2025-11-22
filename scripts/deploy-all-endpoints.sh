#!/bin/bash
set -e

echo "=== Deploying All CodeCruise Lambda Functions & API Gateway ==="

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REGION=$(aws configure get region)
ROLE_NAME="codecruise-lambda-role"
DATABASE_URL="postgresql://codecruise_admin:CodeCruise2024%21SecurePass@codecruise-db.czwcgwu8yzh8.us-east-2.rds.amazonaws.com:5432/codecruise"
JWT_SECRET="production-secret-change-this"

# Get existing API ID or create new one
API_ID=$(aws apigateway get-rest-apis --query "items[?name=='CodeCruise API'].id" --output text)

if [ -z "$API_ID" ] || [ "$API_ID" = "None" ]; then
  echo "Creating new REST API..."
  API_ID=$(aws apigateway create-rest-api \
    --name "CodeCruise API" \
    --description "CodeCruise ride-sharing backend API" \
    --endpoint-configuration types=REGIONAL \
    --query 'id' \
    --output text)
  echo "  Created API: $API_ID"
else
  echo "Using existing API: $API_ID"
fi

ROOT_ID=$(aws apigateway get-resources --rest-api-id $API_ID --query 'items[0].id' --output text)

# Function to create/update Lambda and API Gateway endpoint
deploy_endpoint() {
  local FUNC_NAME=$1
  local HTTP_METHOD=$2
  local PATH=$3
  local HANDLER_FILE=$4

  echo ""
  echo "Deploying: $FUNC_NAME ($HTTP_METHOD $PATH)"

  # Create temp directory in current working directory
  WORK_DIR="$(pwd)/lambda-build-$FUNC_NAME"
  rm -rf "$WORK_DIR"
  mkdir -p "$WORK_DIR"
  cd "$WORK_DIR"

  # Copy handler
  cp "$HANDLER_FILE" index.js

  # Create package.json
  cat > package.json << 'EOF'
{
  "name": "lambda-function",
  "dependencies": {
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.2",
    "pg": "^8.11.3"
  }
}
EOF
  npm install --production --silent 2>/dev/null

  # Create ZIP
  zip -qr function.zip .

  # Delete existing function
  aws lambda delete-function --function-name $FUNC_NAME 2>/dev/null || true

  # Create function
  aws lambda create-function \
    --function-name $FUNC_NAME \
    --runtime nodejs20.x \
    --role arn:aws:iam::${ACCOUNT_ID}:role/${ROLE_NAME} \
    --handler index.handler \
    --zip-file fileb://function.zip \
    --timeout 30 \
    --memory-size 512 \
    --environment "Variables={DATABASE_URL=${DATABASE_URL},JWT_SECRET=${JWT_SECRET},NODE_TLS_REJECT_UNAUTHORIZED=0}" \
    --description "$HTTP_METHOD $PATH" > /dev/null

  echo "  ✅ Lambda deployed"

  cd - > /dev/null
  rm -rf "$WORK_DIR"
}

# Create handler files
HANDLERS_DIR="$(pwd)/lambda-handlers"
rm -rf "$HANDLERS_DIR"
mkdir -p "$HANDLERS_DIR"

# /me handler (GET)
cat > $HANDLERS_DIR/me-handler.js << 'HANDLER'
const jwt = require('jsonwebtoken');
const { Client } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL;
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

exports.handler = async (event) => {
  try {
    const authHeader = event.headers.Authorization || event.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { statusCode: 401, headers: {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'}, body: JSON.stringify({error: 'Unauthorized'}) };
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET);

    const client = new Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false, checkServerIdentity: () => undefined } });
    await client.connect();

    const result = await client.query('SELECT id, name, email, rating, "createdAt" FROM "User" WHERE id = $1', [decoded.sub]);
    await client.end();

    if (result.rows.length === 0) {
      return { statusCode: 404, headers: {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'}, body: JSON.stringify({error: 'User not found'}) };
    }

    return { statusCode: 200, headers: {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type,Authorization'}, body: JSON.stringify(result.rows[0]) };
  } catch (error) {
    console.error('Error:', error);
    return { statusCode: 500, headers: {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'}, body: JSON.stringify({error: 'Internal server error'}) };
  }
};
HANDLER

# /quotes handler (POST)
cat > $HANDLERS_DIR/quotes-handler.js << 'HANDLER'
const jwt = require('jsonwebtoken');
const { Client } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL;
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body || '{}');
    const { pickup, dest } = body;

    if (!pickup || !dest || !pickup.lat || !pickup.lon || !dest.lat || !dest.lon) {
      return {
        statusCode: 400,
        headers: {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        body: JSON.stringify({error: 'pickup and dest with lat/lon required'})
      };
    }

    const distanceKm = calculateDistance(pickup.lat, pickup.lon, dest.lat, dest.lon);
    const baseFare = 10;
    const perKm = 2.5;
    const surge = 1.0; // No surge for simplicity
    const amount = Math.round((baseFare + distanceKm * perKm) * surge * 100) / 100;
    const etaMinutes = Math.ceil(distanceKm / 0.5); // 30km/h average speed

    const quoteId = require('crypto').randomUUID();
    const expiresAt = new Date(Date.now() + 10 * 60000);

    const client = new Client({
      connectionString: DATABASE_URL,
      ssl: { rejectUnauthorized: false, checkServerIdentity: () => undefined }
    });
    await client.connect();

    // Save quote to database (simplified - using a quotes table if it exists, or skip)
    try {
      await client.query(`
        INSERT INTO "Quote" (id, "pickupLat", "pickupLon", "destLat", "destLon", amount, surge, currency, "expiresAt", "createdAt")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [quoteId, pickup.lat, pickup.lon, dest.lat, dest.lon, amount, surge, 'USD', expiresAt, new Date()]);
    } catch (err) {
      console.log('Quote table may not exist, skipping storage:', err.message);
    }

    await client.end();

    return {
      statusCode: 200,
      headers: {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type,Authorization'},
      body: JSON.stringify({
        id: quoteId,
        amount,
        surge,
        currency: 'USD',
        expiresAt: expiresAt.toISOString(),
        etaMinutes
      })
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers: {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
      body: JSON.stringify({error: 'Internal server error'})
    };
  }
};
HANDLER

# /rides handler (POST) with driver location initialization
cat > $HANDLERS_DIR/rides-create-handler.js << 'HANDLER'
const jwt = require('jsonwebtoken');
const { Client } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL;
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

// Pittsburgh area locations for driver initialization
const DRIVER_LOCATIONS = [
  { lat: 40.4443, lon: -79.9436 }, // CMU Campus
  { lat: 40.4506, lon: -79.9859 }, // Oakland
  { lat: 40.4306, lon: -80.0059 }, // South Side
  { lat: 40.4606, lon: -79.9759 }, // Shadyside
  { lat: 40.4206, lon: -80.0159 }  // West End
];

// Global flag to ensure initialization runs only once per Lambda container
let initialized = false;

async function ensureInitialized(client) {
  if (!initialized) {
    console.log('[init-drivers] Initializing driver locations on cold start...');
    const drivers = await client.query('SELECT id FROM "Driver"');

    if (drivers.rows.length === 0) {
      console.warn('[init-drivers] No drivers found in database');
      initialized = true;
      return;
    }

    for (let i = 0; i < drivers.rows.length; i++) {
      const driver = drivers.rows[i];
      const location = DRIVER_LOCATIONS[i % DRIVER_LOCATIONS.length];
      await client.query(
        'UPDATE "Driver" SET "currentLat" = $1, "currentLon" = $2 WHERE id = $3',
        [location.lat, location.lon, driver.id]
      );
    }

    console.log(`[init-drivers] Initialized ${drivers.rows.length} driver locations`);
    initialized = true;
  }
}

exports.handler = async (event) => {
  try {
    const authHeader = event.headers.Authorization || event.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { statusCode: 401, headers: {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'}, body: JSON.stringify({error: 'Unauthorized'}) };
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET);
    const riderId = decoded.sub;

    const body = JSON.parse(event.body || '{}');
    const { pickup, dest, quoteId } = body;

    if (!pickup || !dest || !quoteId) {
      return { statusCode: 400, headers: {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'}, body: JSON.stringify({error: 'pickup, dest, and quoteId required'}) };
    }

    const client = new Client({
      connectionString: DATABASE_URL,
      ssl: { rejectUnauthorized: false, checkServerIdentity: () => undefined }
    });
    await client.connect();

    // Initialize driver locations on first request
    await ensureInitialized(client);

    // Get quote
    let fareAmount = 15; // Default fare
    try {
      const quoteResult = await client.query('SELECT amount FROM "Quote" WHERE id = $1', [quoteId]);
      if (quoteResult.rows.length > 0) {
        fareAmount = quoteResult.rows[0].amount;
      }
    } catch (err) {
      console.log('Quote table may not exist, using default fare');
    }

    // Create ride
    const rideId = require('crypto').randomUUID();
    await client.query(`
      INSERT INTO "Ride" (id, "riderId", "pickupLat", "pickupLon", "destLat", "destLon", "fareAmount", surge, currency, status, "createdAt")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `, [rideId, riderId, pickup.lat, pickup.lon, dest.lat, dest.lon, fareAmount, 1.0, 'USD', 'PENDING', new Date()]);

    // Find available driver
    const driverResult = await client.query(`
      SELECT id FROM "Driver" WHERE available = true LIMIT 1
    `);

    let driverId = null;
    if (driverResult.rows.length > 0) {
      driverId = driverResult.rows[0].id;
      await client.query('UPDATE "Ride" SET "driverId" = $1, status = $2 WHERE id = $3', [driverId, 'DRIVER_ASSIGNED', rideId]);
      await client.query('UPDATE "Driver" SET available = false WHERE id = $1', [driverId]);
    }

    // Get full ride details
    const rideDetails = await client.query(`
      SELECT r.*,
             u.name as "driverName",
             d.rating as "driverRating",
             d."vehicleModel" as "driverVehicle"
      FROM "Ride" r
      LEFT JOIN "Driver" d ON r."driverId" = d.id
      LEFT JOIN "User" u ON d."userId" = u.id
      WHERE r.id = $1
    `, [rideId]);

    await client.end();

    const ride = rideDetails.rows[0];
    return {
      statusCode: 201,
      headers: {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type,Authorization'},
      body: JSON.stringify({
        id: ride.id,
        riderId: ride.riderId,
        driverId: ride.driverId,
        pickup: { lat: ride.pickupLat, lon: ride.pickupLon },
        dest: { lat: ride.destLat, lon: ride.destLon },
        fareAmount: ride.fareAmount,
        status: ride.status,
        driver: ride.driverId ? {
          name: ride.driverName,
          rating: ride.driverRating,
          vehicle: ride.driverVehicle
        } : null
      })
    };
  } catch (error) {
    console.error('Error:', error);
    return { statusCode: 500, headers: {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'}, body: JSON.stringify({error: error.message || 'Internal server error'}) };
  }
};
HANDLER

# /rides/{id} handler (GET)
cat > $HANDLERS_DIR/rides-get-handler.js << 'HANDLER'
const jwt = require('jsonwebtoken');
const { Client } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL;
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

exports.handler = async (event) => {
  try {
    const authHeader = event.headers.Authorization || event.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { statusCode: 401, headers: {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'}, body: JSON.stringify({error: 'Unauthorized'}) };
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET);
    const riderId = decoded.sub;

    const rideId = event.pathParameters?.id;
    if (!rideId) {
      return { statusCode: 400, headers: {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'}, body: JSON.stringify({error: 'Ride ID required'}) };
    }

    const client = new Client({
      connectionString: DATABASE_URL,
      ssl: { rejectUnauthorized: false, checkServerIdentity: () => undefined }
    });
    await client.connect();

    const result = await client.query(`
      SELECT r.*,
             u.name as "driverName",
             d.rating as "driverRating",
             d."vehicleModel" as "driverVehicle"
      FROM "Ride" r
      LEFT JOIN "Driver" d ON r."driverId" = d.id
      LEFT JOIN "User" u ON d."userId" = u.id
      WHERE r.id = $1 AND r."riderId" = $2
    `, [rideId, riderId]);

    await client.end();

    if (result.rows.length === 0) {
      return { statusCode: 404, headers: {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'}, body: JSON.stringify({error: 'Ride not found'}) };
    }

    const ride = result.rows[0];
    return {
      statusCode: 200,
      headers: {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type,Authorization'},
      body: JSON.stringify({
        id: ride.id,
        riderId: ride.riderId,
        driverId: ride.driverId,
        pickup: { lat: ride.pickupLat, lon: ride.pickupLon },
        dest: { lat: ride.destLat, lon: ride.destLon },
        fareAmount: ride.fareAmount,
        status: ride.status,
        driver: ride.driverId ? {
          name: ride.driverName,
          rating: ride.driverRating,
          vehicle: ride.driverVehicle
        } : null
      })
    };
  } catch (error) {
    console.error('Error:', error);
    return { statusCode: 500, headers: {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'}, body: JSON.stringify({error: 'Internal server error'}) };
  }
};
HANDLER

# /ads/sessions handler (POST)
cat > $HANDLERS_DIR/ads-sessions-handler.js << 'HANDLER'
const jwt = require('jsonwebtoken');
const { Client } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL;
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

exports.handler = async (event) => {
  try {
    const authHeader = event.headers.Authorization || event.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { statusCode: 401, headers: {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'}, body: JSON.stringify({error: 'Unauthorized'}) };
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET);
    const riderId = decoded.sub;

    const body = JSON.parse(event.body || '{}');
    const percent = body.percent || 12;

    const sessionId = require('crypto').randomUUID();
    const expiresAt = new Date(Date.now() + 5 * 60000); // 5 minutes

    const client = new Client({
      connectionString: DATABASE_URL,
      ssl: { rejectUnauthorized: false, checkServerIdentity: () => undefined }
    });
    await client.connect();

    await client.query(`
      INSERT INTO "AdSession" (id, "riderId", percent, status, "expiresAt", "createdAt")
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [sessionId, riderId, percent, 'ACTIVE', expiresAt, new Date()]);

    await client.end();

    return {
      statusCode: 201,
      headers: {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type,Authorization'},
      body: JSON.stringify({
        sessionId,
        provider: 'mock-ads',
        percent,
        expiresAt: expiresAt.toISOString()
      })
    };
  } catch (error) {
    console.error('Error:', error);
    return { statusCode: 500, headers: {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'}, body: JSON.stringify({error: 'Internal server error'}) };
  }
};
HANDLER

# /ads/complete handler (POST)
cat > $HANDLERS_DIR/ads-complete-handler.js << 'HANDLER'
const jwt = require('jsonwebtoken');
const { Client } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL;
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

exports.handler = async (event) => {
  try {
    const authHeader = event.headers.Authorization || event.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { statusCode: 401, headers: {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'}, body: JSON.stringify({error: 'Unauthorized'}) };
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET);

    const body = JSON.parse(event.body || '{}');
    const { sessionId } = body;

    if (!sessionId) {
      return { statusCode: 400, headers: {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'}, body: JSON.stringify({error: 'sessionId required'}) };
    }

    const client = new Client({
      connectionString: DATABASE_URL,
      ssl: { rejectUnauthorized: false, checkServerIdentity: () => undefined }
    });
    await client.connect();

    // Get session
    const sessionResult = await client.query(`
      SELECT * FROM "AdSession" WHERE id = $1
    `, [sessionId]);

    if (sessionResult.rows.length === 0) {
      await client.end();
      return { statusCode: 404, headers: {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'}, body: JSON.stringify({error: 'Session not found'}) };
    }

    const session = sessionResult.rows[0];

    // Create discount token
    const tokenId = require('crypto').randomUUID();
    const tokenExpiresAt = new Date(Date.now() + 10 * 60000); // 10 minutes

    await client.query(`
      INSERT INTO "DiscountToken" (id, "sessionId", percent, state, "expiresAt", "createdAt")
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [tokenId, sessionId, session.percent, 'ISSUED', tokenExpiresAt, new Date()]);

    // Update session
    await client.query(`
      UPDATE "AdSession" SET status = $1, "completedAt" = $2 WHERE id = $3
    `, ['COMPLETED', new Date(), sessionId]);

    await client.end();

    return {
      statusCode: 200,
      headers: {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type,Authorization'},
      body: JSON.stringify({
        tokenId,
        expiresAt: tokenExpiresAt.toISOString()
      })
    };
  } catch (error) {
    console.error('Error:', error);
    return { statusCode: 500, headers: {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'}, body: JSON.stringify({error: 'Internal server error'}) };
  }
};
HANDLER

# /payments/intents handler (POST)
cat > $HANDLERS_DIR/payments-intents-handler.js << 'HANDLER'
const jwt = require('jsonwebtoken');
const { Client } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL;
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

exports.handler = async (event) => {
  try {
    const authHeader = event.headers.Authorization || event.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { statusCode: 401, headers: {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'}, body: JSON.stringify({error: 'Unauthorized'}) };
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET);
    const riderId = decoded.sub;

    const body = JSON.parse(event.body || '{}');
    const { rideId } = body;

    if (!rideId) {
      return { statusCode: 400, headers: {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'}, body: JSON.stringify({error: 'rideId required'}) };
    }

    const client = new Client({
      connectionString: DATABASE_URL,
      ssl: { rejectUnauthorized: false, checkServerIdentity: () => undefined }
    });
    await client.connect();

    // Get ride
    const rideResult = await client.query(`
      SELECT * FROM "Ride" WHERE id = $1 AND "riderId" = $2
    `, [rideId, riderId]);

    if (rideResult.rows.length === 0) {
      await client.end();
      return { statusCode: 404, headers: {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'}, body: JSON.stringify({error: 'Ride not found'}) };
    }

    const ride = rideResult.rows[0];

    // Create payment intent
    const intentId = `pi_${require('crypto').randomUUID()}`;
    await client.query(`
      INSERT INTO "PaymentIntent" (id, "rideId", amount, currency, status, "createdAt")
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [intentId, rideId, ride.fareAmount, 'USD', 'PENDING', new Date()]);

    await client.end();

    return {
      statusCode: 200,
      headers: {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type,Authorization'},
      body: JSON.stringify({ intentId })
    };
  } catch (error) {
    console.error('Error:', error);
    return { statusCode: 500, headers: {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'}, body: JSON.stringify({error: 'Internal server error'}) };
  }
};
HANDLER

# /payments/confirm handler (POST)
cat > $HANDLERS_DIR/payments-confirm-handler.js << 'HANDLER'
const jwt = require('jsonwebtoken');
const { Client } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL;
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

exports.handler = async (event) => {
  try {
    const authHeader = event.headers.Authorization || event.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { statusCode: 401, headers: {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'}, body: JSON.stringify({error: 'Unauthorized'}) };
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET);

    const body = JSON.parse(event.body || '{}');
    const { intentId, method } = body;

    if (!intentId || !method) {
      return { statusCode: 400, headers: {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'}, body: JSON.stringify({error: 'intentId and method required'}) };
    }

    const client = new Client({
      connectionString: DATABASE_URL,
      ssl: { rejectUnauthorized: false, checkServerIdentity: () => undefined }
    });
    await client.connect();

    // Update payment intent
    await client.query(`
      UPDATE "PaymentIntent" SET status = $1, method = $2, "confirmedAt" = $3 WHERE id = $4
    `, ['SUCCEEDED', method, new Date(), intentId]);

    await client.end();

    return {
      statusCode: 200,
      headers: {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type,Authorization'},
      body: JSON.stringify({ status: 'SUCCEEDED' })
    };
  } catch (error) {
    console.error('Error:', error);
    return { statusCode: 500, headers: {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'}, body: JSON.stringify({error: 'Internal server error'}) };
  }
};
HANDLER

# /login handler (POST)
cat > $HANDLERS_DIR/login-handler.js << 'HANDLER'
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Client } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL;
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body || '{}');
    const { email, password } = body;

    if (!email || !password) {
      return {
        statusCode: 400,
        headers: {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        body: JSON.stringify({error: 'Email and password required'})
      };
    }

    const client = new Client({
      connectionString: DATABASE_URL,
      ssl: { rejectUnauthorized: false, checkServerIdentity: () => undefined }
    });
    await client.connect();

    const result = await client.query('SELECT * FROM "User" WHERE email = $1', [email]);
    await client.end();

    if (result.rows.length === 0) {
      return {
        statusCode: 401,
        headers: {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        body: JSON.stringify({error: 'Invalid credentials'})
      };
    }

    const user = result.rows[0];
    const isValid = await bcrypt.compare(password, user.passwordHash);

    if (!isValid) {
      return {
        statusCode: 401,
        headers: {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        body: JSON.stringify({error: 'Invalid credentials'})
      };
    }

    const token = jwt.sign(
      { sub: user.id, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return {
      statusCode: 200,
      headers: {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type,Authorization'},
      body: JSON.stringify({ token })
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers: {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
      body: JSON.stringify({error: 'Internal server error'})
    };
  }
};
HANDLER

# /rides/{id}/complete handler (POST)
cat > $HANDLERS_DIR/rides-complete-handler.js << 'HANDLER'
const jwt = require('jsonwebtoken');
const { Client } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL;
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

exports.handler = async (event) => {
  try {
    const authHeader = event.headers.Authorization || event.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        statusCode: 401,
        headers: {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        body: JSON.stringify({error: 'Unauthorized'})
      };
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET);
    const riderId = decoded.sub;

    const rideId = event.pathParameters?.id;
    if (!rideId) {
      return {
        statusCode: 400,
        headers: {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        body: JSON.stringify({error: 'Ride ID required'})
      };
    }

    const client = new Client({
      connectionString: DATABASE_URL,
      ssl: { rejectUnauthorized: false, checkServerIdentity: () => undefined }
    });
    await client.connect();

    // Update ride status and set driver available again
    const result = await client.query(`
      UPDATE "Ride" SET status = $1, "completedAt" = $2 WHERE id = $3 AND "riderId" = $4 RETURNING "driverId"
    `, ['COMPLETED', new Date(), rideId, riderId]);

    if (result.rows.length === 0) {
      await client.end();
      return {
        statusCode: 404,
        headers: {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        body: JSON.stringify({error: 'Ride not found'})
      };
    }

    const driverId = result.rows[0].driverId;
    if (driverId) {
      await client.query('UPDATE "Driver" SET available = true WHERE id = $1', [driverId]);
    }

    await client.end();

    return {
      statusCode: 200,
      headers: {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type,Authorization'},
      body: JSON.stringify({ status: 'COMPLETED' })
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers: {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
      body: JSON.stringify({error: error.message || 'Internal server error'})
    };
  }
};
HANDLER

# /ads/eligibility handler (GET) with 15s cooldown (using database)
cat > $HANDLERS_DIR/ads-eligibility-handler.js << 'HANDLER'
const jwt = require('jsonwebtoken');
const { Client } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL;
const JWT_SECRET = process.env.JWT_SECRET || 'secret';
const COOLDOWN_MS = 15 * 1000; // 15 seconds

exports.handler = async (event) => {
  try {
    const authHeader = event.headers.Authorization || event.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        statusCode: 401,
        headers: {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        body: JSON.stringify({error: 'Unauthorized'})
      };
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET);
    const riderId = decoded.sub;

    const client = new Client({
      connectionString: DATABASE_URL,
      ssl: { rejectUnauthorized: false, checkServerIdentity: () => undefined }
    });
    await client.connect();

    // Get the most recent COMPLETED ad session for this rider
    const lastAdResult = await client.query(`
      SELECT "completedAt" FROM "AdSession"
      WHERE "riderId" = $1 AND status = 'COMPLETED'
      ORDER BY "completedAt" DESC
      LIMIT 1
    `, [riderId]);

    await client.end();

    if (lastAdResult.rows.length > 0) {
      const lastCompletedAt = new Date(lastAdResult.rows[0].completedAt).getTime();
      const now = Date.now();
      const timeSinceLastAd = now - lastCompletedAt;

      if (timeSinceLastAd < COOLDOWN_MS) {
        const cooldownEndsAt = new Date(lastCompletedAt + COOLDOWN_MS).toISOString();
        return {
          statusCode: 200,
          headers: {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type,Authorization'},
          body: JSON.stringify({
            eligible: false,
            reason: 'COOLDOWN',
            cooldownEndsAt
          })
        };
      }
    }

    return {
      statusCode: 200,
      headers: {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type,Authorization'},
      body: JSON.stringify({
        eligible: true
      })
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers: {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
      body: JSON.stringify({error: 'Internal server error'})
    };
  }
};
HANDLER

# /ads/playback handler (POST)
cat > $HANDLERS_DIR/ads-playback-handler.js << 'HANDLER'
const jwt = require('jsonwebtoken');
const { Client } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL;
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

exports.handler = async (event) => {
  try {
    const authHeader = event.headers.Authorization || event.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        statusCode: 401,
        headers: {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        body: JSON.stringify({error: 'Unauthorized'})
      };
    }

    const token = authHeader.substring(7);
    jwt.verify(token, JWT_SECRET);

    const body = JSON.parse(event.body || '{}');
    const { sessionId, event: adEvent } = body;

    if (!sessionId || !adEvent) {
      return {
        statusCode: 400,
        headers: {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        body: JSON.stringify({error: 'sessionId and event required'})
      };
    }

    // Just acknowledge - we don't track individual playback events in DB
    console.log(`Ad playback event: ${adEvent} for session ${sessionId}`);

    return {
      statusCode: 200,
      headers: {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type,Authorization'},
      body: JSON.stringify({ status: 'ok' })
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers: {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
      body: JSON.stringify({error: 'Internal server error'})
    };
  }
};
HANDLER

# /reset-test-data handler (POST)
cat > $HANDLERS_DIR/reset-test-data-handler.js << 'HANDLER'
const jwt = require('jsonwebtoken');
const { Client } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL;
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

// Pittsburgh area locations for driver initialization
const DRIVER_LOCATIONS = [
  { lat: 40.4443, lon: -79.9436 }, // CMU Campus
  { lat: 40.4506, lon: -79.9859 }, // Oakland
  { lat: 40.4306, lon: -80.0059 }, // South Side
  { lat: 40.4606, lon: -79.9759 }, // Shadyside
  { lat: 40.4206, lon: -80.0159 }  // West End
];

exports.handler = async (event) => {
  try {
    const authHeader = event.headers.Authorization || event.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        statusCode: 401,
        headers: {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
        body: JSON.stringify({error: 'Unauthorized'})
      };
    }

    const token = authHeader.substring(7);
    jwt.verify(token, JWT_SECRET);

    const client = new Client({
      connectionString: DATABASE_URL,
      ssl: { rejectUnauthorized: false, checkServerIdentity: () => undefined }
    });
    await client.connect();

    // Get all drivers
    const driversResult = await client.query('SELECT id FROM "Driver"');
    const drivers = driversResult.rows;

    console.log(`Resetting ${drivers.length} drivers to AVAILABLE`);

    // Reset all drivers to available with locations
    for (let i = 0; i < drivers.length; i++) {
      const driver = drivers[i];
      const location = DRIVER_LOCATIONS[i % DRIVER_LOCATIONS.length];

      await client.query(`
        UPDATE "Driver"
        SET available = true,
            "currentLat" = $1,
            "currentLon" = $2
        WHERE id = $3
      `, [location.lat, location.lon, driver.id]);
    }

    await client.end();

    return {
      statusCode: 200,
      headers: {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type,Authorization'},
      body: JSON.stringify({
        message: 'Test data reset successfully',
        driversReset: drivers.length
      })
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers: {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
      body: JSON.stringify({error: error.message || 'Internal server error'})
    };
  }
};
HANDLER

echo "Created handler files"

# Deploy all functions
echo ""
echo "=== Deploying Lambda Functions ==="

deploy_endpoint "codecruise-login" "POST" "/login" "$HANDLERS_DIR/login-handler.js"
deploy_endpoint "codecruise-me" "GET" "/me" "$HANDLERS_DIR/me-handler.js"
deploy_endpoint "codecruise-quotes" "POST" "/quotes" "$HANDLERS_DIR/quotes-handler.js"
deploy_endpoint "codecruise-rides-create" "POST" "/rides" "$HANDLERS_DIR/rides-create-handler.js"
deploy_endpoint "codecruise-rides-get" "GET" "/rides/{id}" "$HANDLERS_DIR/rides-get-handler.js"
deploy_endpoint "codecruise-rides-complete" "POST" "/rides/{id}/complete" "$HANDLERS_DIR/rides-complete-handler.js"
deploy_endpoint "codecruise-ads-eligibility" "GET" "/ads/eligibility" "$HANDLERS_DIR/ads-eligibility-handler.js"
deploy_endpoint "codecruise-ads-sessions" "POST" "/ads/sessions" "$HANDLERS_DIR/ads-sessions-handler.js"
deploy_endpoint "codecruise-ads-playback" "POST" "/ads/playback" "$HANDLERS_DIR/ads-playback-handler.js"
deploy_endpoint "codecruise-ads-complete" "POST" "/ads/complete" "$HANDLERS_DIR/ads-complete-handler.js"
deploy_endpoint "codecruise-payments-intents" "POST" "/payments/intents" "$HANDLERS_DIR/payments-intents-handler.js"
deploy_endpoint "codecruise-payments-confirm" "POST" "/payments/confirm" "$HANDLERS_DIR/payments-confirm-handler.js"
deploy_endpoint "codecruise-reset-test-data" "POST" "/reset-test-data" "$HANDLERS_DIR/reset-test-data-handler.js"

echo ""
echo "=== Lambda Functions Deployed! ==="
echo ""
echo "Deployed functions:"
echo "  - codecruise-login (POST /login)"
echo "  - codecruise-me (GET /me)"
echo "  - codecruise-quotes (POST /quotes)"
echo "  - codecruise-rides-create (POST /rides) [with driver init]"
echo "  - codecruise-rides-get (GET /rides/{id})"
echo "  - codecruise-rides-complete (POST /rides/{id}/complete)"
echo "  - codecruise-ads-eligibility (GET /ads/eligibility) [15s cooldown]"
echo "  - codecruise-ads-sessions (POST /ads/sessions)"
echo "  - codecruise-ads-playback (POST /ads/playback)"
echo "  - codecruise-ads-complete (POST /ads/complete)"
echo "  - codecruise-payments-intents (POST /payments/intents)"
echo "  - codecruise-payments-confirm (POST /payments/confirm)"
echo "  - codecruise-reset-test-data (POST /reset-test-data) [auto-reset on login]"
echo ""
echo "Next step: Run setup-api-gateway.sh to connect all functions to API Gateway"
echo ""
