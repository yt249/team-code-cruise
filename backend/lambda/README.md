# CodeCruise Lambda Deployment

This directory contains AWS Lambda handlers for deploying the CodeCruise backend to AWS Lambda + API Gateway.

## What We've Built

### Lambda Handlers Created
- `auth.handler.ts` - Login (`/login`) and Get User (`/me`)
- `quote.handler.ts` - Fare quotes (`/quotes`)
- `ride.handler.ts` - Rides (`/rides`, `/rides/{id}`, `/rides/{id}/complete`, `/rides/{id}/cancel`)
- `ad.handler.ts` - Advertisements (`/ads/eligibility`, `/ads/sessions`, `/ads/playback`, `/ads/complete`)
- `payment.handler.ts` - Payments (`/payments/intents`, `/payments/confirm`)

### Supporting Files
- `apiGatewayAdapter.ts` - Converts API Gateway events to handler requests
- `init.ts` - Lambda initialization (sets up memory DB on cold start)
- `tsconfig.json` - TypeScript configuration for Lambda build
- `package.json` - Lambda dependencies

## Important Notes

### Database Limitation
**The memory database (`RB_DATA_MODE=memory`) is NOT recommended for production Lambda because:**
- Each Lambda instance has its own memory space
- Data doesn't persist between Lambda invocations across different instances
- Cold starts reset all data

**For production, you MUST use:**
- AWS RDS PostgreSQL database
- Set `DATABASE_URL` environment variable in Lambda configuration
- Remove `RB_DATA_MODE=memory` environment variable

### Current Setup (Testing Only)
The current configuration uses memory mode for basic testing:
- Memory DB is initialized on Lambda cold start
- Data persists only within a single Lambda container's lifetime
- Different concurrent requests may hit different Lambda instances with different data

## Deployment Steps

### Step 1: Install Dependencies
```bash
cd backend/lambda
npm install
```

### Step 2: Deploy Login Function (Test)
```bash
chmod +x deploy-login.sh
./deploy-login.sh
```

This will:
1. Create IAM role for Lambda execution
2. Compile TypeScript code
3. Package Lambda function with dependencies
4. Deploy to AWS Lambda

### Step 3: Test the Lambda Function
```bash
aws lambda invoke \
  --function-name codecruise-login \
  --cli-binary-format raw-in-base64-out \
  --payload '{"body": "{\"email\":\"rider@example.com\",\"password\":\"ride1234\"}"}' \
  response.json

cat response.json
```

Expected response:
```json
{
  "statusCode": 200,
  "headers": {...},
  "body": "{\"token\":\"eyJhbG...\"}"
}
```

### Step 4: Create API Gateway (Next)
After testing the Lambda function, you'll need to:
1. Create REST API in API Gateway
2. Create resources and methods for each endpoint
3. Connect each API Gateway endpoint to corresponding Lambda function
4. Deploy API to a stage (e.g., "prod")
5. Get the API Gateway URL

### Step 5: Update Frontend
Once API Gateway is deployed, update frontend:
```bash
# frontend/.env.production
VITE_API_BASE_URL=https://your-api-id.execute-api.us-east-2.amazonaws.com/prod
```

## Deploying All Endpoints

To deploy all endpoints, you'll need to:

1. **Create Lambda functions for each handler:**
   - codecruise-login (POST /login)
   - codecruise-me (GET /me)
   - codecruise-create-quote (POST /quotes)
   - codecruise-create-ride (POST /rides)
   - codecruise-get-ride (GET /rides/{id})
   - codecruise-complete-ride (POST /rides/{id}/complete)
   - codecruise-cancel-ride (POST /rides/{id}/cancel)
   - And so on...

2. **Create API Gateway REST API:**
   ```bash
   aws apigateway create-rest-api \
     --name codecruise-api \
     --description "CodeCruise REST API"
   ```

3. **Create resources and methods** for each endpoint

4. **Connect Lambda functions** to API Gateway methods

This process can be automated with AWS SAM, Serverless Framework, or Terraform.

## Recommended: Use AWS SAM or Serverless Framework

Instead of manually creating each Lambda function, consider using:

### AWS SAM (Serverless Application Model)
```yaml
# template.yaml
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31

Resources:
  LoginFunction:
    Type: AWS::Serverless::Function
    Properties:
      Handler: lambda/auth.handler.loginHandler
      Runtime: nodejs20.x
      Events:
        LoginApi:
          Type: Api
          Properties:
            Path: /login
            Method: post
```

### Serverless Framework
```yaml
# serverless.yml
service: codecruise

provider:
  name: aws
  runtime: nodejs20.x

functions:
  login:
    handler: lambda/auth.handler.loginHandler
    events:
      - http:
          path: login
          method: post
```

## Environment Variables

Set these in Lambda configuration:

**For Testing (Memory Mode):**
```
JWT_SECRET=dev-secret-change-in-prod
RB_DATA_MODE=memory
```

**For Production (RDS):**
```
JWT_SECRET=<secure-random-string>
DATABASE_URL=postgresql://user:pass@rds-endpoint:5432/dbname
```

## Next Steps

1. ✅ Test login Lambda function
2. ⏳ Create API Gateway REST API
3. ⏳ Connect Lambda functions to API Gateway
4. ⏳ Deploy API Gateway to production stage
5. ⏳ Update frontend to use API Gateway URL
6. ⏳ Set up RDS PostgreSQL database (for production)
7. ⏳ Update Lambda environment variables to use RDS

## Troubleshooting

### "Memory DB not initialized" error
- Make sure `init.ts` is imported at the top of your handler
- Check that `RB_DATA_MODE=memory` is set in Lambda environment variables

### "Module not found" errors
- Ensure all dependencies are in `package.json`
- Run `npm install` before building
- Check that TypeScript compilation succeeded

### Database connection errors
- If not using memory mode, verify `DATABASE_URL` is set correctly
- Ensure RDS security group allows Lambda VPC access
- Lambda must be in same VPC as RDS

## Cost Considerations

- **Lambda**: Free tier includes 1M requests/month
- **API Gateway**: Free tier includes 1M API calls/month
- **RDS**: No free tier (starts ~$15/month for smallest instance)

For development, memory mode keeps costs minimal.
