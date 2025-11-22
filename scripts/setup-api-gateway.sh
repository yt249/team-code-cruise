#!/bin/bash
set -e

echo "=== Setting Up AWS API Gateway ==="

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REGION=$(aws configure get region)

# Create REST API
echo "Creating REST API..."
API_ID=$(aws apigateway create-rest-api \
  --name "CodeCruise API" \
  --description "CodeCruise ride-sharing backend API" \
  --endpoint-configuration types=REGIONAL \
  --query 'id' \
  --output text)

echo "  API ID: $API_ID"

# Get root resource
ROOT_ID=$(aws apigateway get-resources --rest-api-id $API_ID --query 'items[0].id' --output text)
echo "  Root Resource ID: $ROOT_ID"

# Create /login resource
echo ""
echo "Creating /login endpoint..."
LOGIN_RESOURCE_ID=$(aws apigateway create-resource \
  --rest-api-id $API_ID \
  --parent-id $ROOT_ID \
  --path-part login \
  --query 'id' \
  --output text)

# Create POST method for /login
aws apigateway put-method \
  --rest-api-id $API_ID \
  --resource-id $LOGIN_RESOURCE_ID \
  --http-method POST \
  --authorization-type NONE \
  --no-api-key-required > /dev/null

# Create OPTIONS method for CORS
aws apigateway put-method \
  --rest-api-id $API_ID \
  --resource-id $LOGIN_RESOURCE_ID \
  --http-method OPTIONS \
  --authorization-type NONE \
  --no-api-key-required > /dev/null

# Integrate POST with Lambda
LAMBDA_ARN="arn:aws:lambda:${REGION}:${ACCOUNT_ID}:function:codecruise-login"

aws apigateway put-integration \
  --rest-api-id $API_ID \
  --resource-id $LOGIN_RESOURCE_ID \
  --http-method POST \
  --type AWS_PROXY \
  --integration-http-method POST \
  --uri "arn:aws:apigateway:${REGION}:lambda:path/2015-03-31/functions/${LAMBDA_ARN}/invocations" > /dev/null

# Setup OPTIONS method response first (required before integration response)
aws apigateway put-method-response \
  --rest-api-id $API_ID \
  --resource-id $LOGIN_RESOURCE_ID \
  --http-method OPTIONS \
  --status-code 200 \
  --response-parameters '{
    "method.response.header.Access-Control-Allow-Headers":false,
    "method.response.header.Access-Control-Allow-Methods":false,
    "method.response.header.Access-Control-Allow-Origin":false
  }' > /dev/null

# Integrate OPTIONS for CORS preflight
aws apigateway put-integration \
  --rest-api-id $API_ID \
  --resource-id $LOGIN_RESOURCE_ID \
  --http-method OPTIONS \
  --type MOCK \
  --request-templates '{"application/json":"{\"statusCode\": 200}"}' > /dev/null

aws apigateway put-integration-response \
  --rest-api-id $API_ID \
  --resource-id $LOGIN_RESOURCE_ID \
  --http-method OPTIONS \
  --status-code 200 \
  --response-parameters '{
    "method.response.header.Access-Control-Allow-Headers":"'"'"'Content-Type,Authorization'"'"'",
    "method.response.header.Access-Control-Allow-Methods":"'"'"'POST,OPTIONS'"'"'",
    "method.response.header.Access-Control-Allow-Origin":"'"'"'*'"'"'"
  }' > /dev/null

# Grant API Gateway permission to invoke Lambda
aws lambda add-permission \
  --function-name codecruise-login \
  --statement-id apigateway-login-post \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:${REGION}:${ACCOUNT_ID}:${API_ID}/*/*" 2>/dev/null || echo "  Permission already exists"

# Deploy API
echo ""
echo "Deploying API to 'prod' stage..."
aws apigateway create-deployment \
  --rest-api-id $API_ID \
  --stage-name prod \
  --description "Production deployment" > /dev/null

API_URL="https://${API_ID}.execute-api.${REGION}.amazonaws.com/prod"

echo ""
echo "=== API Gateway Setup Complete! ==="
echo ""
echo "API URL: $API_URL"
echo ""
echo "Endpoints:"
echo "  POST $API_URL/login"
echo ""
echo "Test it:"
echo "  curl -X POST $API_URL/login -H 'Content-Type: application/json' -d '{\"email\":\"rider@example.com\",\"password\":\"ride1234\"}'"
echo ""
echo "Save this URL to frontend/.env.production:"
echo "  VITE_API_BASE_URL=$API_URL"
echo ""
