#!/bin/bash
set -e

echo "=== Deploying Login Lambda Function ==="

# Get AWS account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo "AWS Account ID: $ACCOUNT_ID"

# Function configuration
FUNCTION_NAME="codecruise-login"
ROLE_NAME="codecruise-lambda-role"

# Create IAM role if it doesn't exist
echo "Setting up IAM role..."
cat > trust-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {"Service": "lambda.amazonaws.com"},
    "Action": "sts:AssumeRole"
  }]
}
EOF

aws iam create-role \
  --role-name ${ROLE_NAME} \
  --assume-role-policy-document file://trust-policy.json 2>/dev/null || echo "Role already exists"

# Attach execution policy
aws iam attach-role-policy \
  --role-name ${ROLE_NAME} \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole 2>/dev/null || echo "Policy already attached"

# Wait for role to propagate
echo "Waiting for IAM role to propagate..."
sleep 10

# Build TypeScript code
echo "Building TypeScript..."
cd /Users/watsonchao/CMU/Courses/fall25/AITools/P6/team-code-cruise/backend

# Install lambda dependencies if needed
if [ ! -d "lambda/node_modules" ]; then
  echo "Installing Lambda dependencies..."
  cd lambda
  npm install
  cd ..
fi

# Compile TypeScript to CommonJS
echo "Compiling TypeScript..."
npx tsc -p lambda/tsconfig.json

# Create package directory
echo "Creating deployment package..."
mkdir -p lambda/deploy
cd lambda/deploy

# Copy compiled code
cp -r ../dist/* .

# Copy node_modules (only production dependencies)
cp -r ../node_modules .

# Create index.js that exports the login handler
cat > index.js << 'EOF'
const { loginHandler } = require('./lambda/auth.handler');
exports.handler = loginHandler;
EOF

# Create zip file
zip -qr ../login-function.zip .
cd ..
rm -rf deploy

echo "Package created: lambda/login-function.zip"

# Delete existing function if it exists
aws lambda delete-function --function-name ${FUNCTION_NAME} 2>/dev/null || echo "No existing function"

# Create Lambda function
echo "Creating Lambda function..."
aws lambda create-function \
  --function-name ${FUNCTION_NAME} \
  --runtime nodejs20.x \
  --role arn:aws:iam::${ACCOUNT_ID}:role/${ROLE_NAME} \
  --handler index.handler \
  --zip-file fileb://lambda/login-function.zip \
  --timeout 30 \
  --memory-size 512 \
  --environment Variables="{JWT_SECRET=dev-secret-change-in-prod,RB_DATA_MODE=memory}"

echo ""
echo "=== Lambda function deployed successfully! ==="
echo "Function name: ${FUNCTION_NAME}"
echo "ARN: arn:aws:lambda:us-east-2:${ACCOUNT_ID}:function:${FUNCTION_NAME}"
echo ""
echo "Test it with:"
echo '  aws lambda invoke --function-name codecruise-login --payload '"'"'{"body": "{\"email\":\"rider@example.com\",\"password\":\"ride1234\"}"}'"'"' response.json'
echo ""
