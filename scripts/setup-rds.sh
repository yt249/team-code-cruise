#!/bin/bash
set -e

echo "=== Setting Up AWS RDS PostgreSQL for CodeCruise ==="
echo ""

# Configuration
DB_INSTANCE_ID="codecruise-db"
DB_NAME="codecruise"
DB_USERNAME="codecruise_admin"
DB_PASSWORD="CodeCruise2024!SecurePass"  # Change this to a secure password
DB_INSTANCE_CLASS="db.t3.micro"  # Free tier eligible
STORAGE_SIZE=20  # GB
REGION=$(aws configure get region)

echo "Configuration:"
echo "  Instance ID: ${DB_INSTANCE_ID}"
echo "  Database Name: ${DB_NAME}"
echo "  Username: ${DB_USERNAME}"
echo "  Instance Class: ${DB_INSTANCE_CLASS}"
echo "  Storage: ${STORAGE_SIZE} GB"
echo "  Region: ${REGION}"
echo ""

# Get default VPC
echo "Getting default VPC..."
VPC_ID=$(aws ec2 describe-vpcs --filters "Name=is-default,Values=true" --query "Vpcs[0].VpcId" --output text)
echo "  VPC ID: ${VPC_ID}"

# Create security group for RDS
echo ""
echo "Creating security group for RDS..."
SG_NAME="codecruise-rds-sg"
SG_DESC="Security group for CodeCruise RDS PostgreSQL"

# Check if security group exists
EXISTING_SG=$(aws ec2 describe-security-groups \
  --filters "Name=group-name,Values=${SG_NAME}" "Name=vpc-id,Values=${VPC_ID}" \
  --query "SecurityGroups[0].GroupId" \
  --output text 2>/dev/null || echo "None")

if [ "$EXISTING_SG" != "None" ] && [ -n "$EXISTING_SG" ]; then
  echo "  Security group already exists: ${EXISTING_SG}"
  SG_ID=$EXISTING_SG
else
  SG_ID=$(aws ec2 create-security-group \
    --group-name ${SG_NAME} \
    --description "${SG_DESC}" \
    --vpc-id ${VPC_ID} \
    --query 'GroupId' \
    --output text)
  echo "  Created security group: ${SG_ID}"

  # Allow PostgreSQL access from anywhere (0.0.0.0/0)
  # For production, restrict this to Lambda VPC or specific IPs
  echo "  Adding inbound rule for PostgreSQL (port 5432)..."
  aws ec2 authorize-security-group-ingress \
    --group-id ${SG_ID} \
    --protocol tcp \
    --port 5432 \
    --cidr 0.0.0.0/0 2>/dev/null || echo "  Inbound rule already exists"
fi

# Create DB subnet group (required for RDS)
echo ""
echo "Setting up DB subnet group..."
SUBNET_GROUP_NAME="codecruise-subnet-group"

# Get all subnets in the VPC
SUBNETS=$(aws ec2 describe-subnets \
  --filters "Name=vpc-id,Values=${VPC_ID}" \
  --query "Subnets[*].SubnetId" \
  --output text)

# Check if subnet group exists
EXISTING_SUBNET_GROUP=$(aws rds describe-db-subnet-groups \
  --db-subnet-group-name ${SUBNET_GROUP_NAME} \
  --query "DBSubnetGroups[0].DBSubnetGroupName" \
  --output text 2>/dev/null || echo "None")

if [ "$EXISTING_SUBNET_GROUP" != "None" ]; then
  echo "  Subnet group already exists: ${SUBNET_GROUP_NAME}"
else
  aws rds create-db-subnet-group \
    --db-subnet-group-name ${SUBNET_GROUP_NAME} \
    --db-subnet-group-description "Subnet group for CodeCruise RDS" \
    --subnet-ids ${SUBNETS}
  echo "  Created subnet group: ${SUBNET_GROUP_NAME}"
fi

# Check if RDS instance already exists
echo ""
echo "Checking if RDS instance exists..."
EXISTING_DB=$(aws rds describe-db-instances \
  --db-instance-identifier ${DB_INSTANCE_ID} \
  --query "DBInstances[0].DBInstanceStatus" \
  --output text 2>/dev/null || echo "None")

if [ "$EXISTING_DB" != "None" ]; then
  echo "  RDS instance already exists with status: ${EXISTING_DB}"

  if [ "$EXISTING_DB" = "available" ]; then
    echo "  Instance is ready!"
  else
    echo "  Waiting for instance to become available..."
    aws rds wait db-instance-available --db-instance-identifier ${DB_INSTANCE_ID}
  fi
else
  # Create RDS PostgreSQL instance
  echo "Creating RDS PostgreSQL instance..."
  echo "  This will take 5-10 minutes..."

  aws rds create-db-instance \
    --db-instance-identifier ${DB_INSTANCE_ID} \
    --db-instance-class ${DB_INSTANCE_CLASS} \
    --engine postgres \
    --engine-version 15.15 \
    --master-username ${DB_USERNAME} \
    --master-user-password "${DB_PASSWORD}" \
    --allocated-storage ${STORAGE_SIZE} \
    --db-name ${DB_NAME} \
    --vpc-security-group-ids ${SG_ID} \
    --db-subnet-group-name ${SUBNET_GROUP_NAME} \
    --publicly-accessible \
    --no-multi-az \
    --storage-type gp2 \
    --backup-retention-period 0 \
    --no-auto-minor-version-upgrade \
    --tags Key=Project,Value=CodeCruise Key=Environment,Value=Production

  echo ""
  echo "  Waiting for RDS instance to become available..."
  echo "  This can take 5-10 minutes. Please be patient..."
  aws rds wait db-instance-available --db-instance-identifier ${DB_INSTANCE_ID}
  echo "  ✅ RDS instance is now available!"
fi

# Get RDS endpoint
echo ""
echo "Getting RDS endpoint..."
DB_ENDPOINT=$(aws rds describe-db-instances \
  --db-instance-identifier ${DB_INSTANCE_ID} \
  --query "DBInstances[0].Endpoint.Address" \
  --output text)

DB_PORT=$(aws rds describe-db-instances \
  --db-instance-identifier ${DB_INSTANCE_ID} \
  --query "DBInstances[0].Endpoint.Port" \
  --output text)

echo "  Endpoint: ${DB_ENDPOINT}"
echo "  Port: ${DB_PORT}"

# Create DATABASE_URL
DATABASE_URL="postgresql://${DB_USERNAME}:${DB_PASSWORD}@${DB_ENDPOINT}:${DB_PORT}/${DB_NAME}"

echo ""
echo "=== RDS Setup Complete! ==="
echo ""
echo "Database Connection String:"
echo "${DATABASE_URL}"
echo ""
echo "Save this connection string - you'll need it for:"
echo "  1. Running Prisma migrations"
echo "  2. Lambda environment variables"
echo ""

# Save to .env file
echo ""
echo "Saving to backend/.env.rds..."
cat > backend/.env.rds << EOF
# RDS PostgreSQL Connection
# Generated by setup-rds.sh on $(date)

DATABASE_URL=${DATABASE_URL}
JWT_SECRET=your-production-secret-change-this
PORT=3000

# DO NOT set RB_DATA_MODE for production
# RB_DATA_MODE is only for local development with memory DB
EOF

echo "  ✅ Saved to backend/.env.rds"
echo ""
echo "Next steps:"
echo "  1. Run Prisma migrations: cd backend && DATABASE_URL='${DATABASE_URL}' npm run prisma:migrate"
echo "  2. Update Lambda environment variables with DATABASE_URL"
echo "  3. Deploy Lambda functions"
echo ""
echo "To delete this RDS instance later:"
echo "  aws rds delete-db-instance --db-instance-identifier ${DB_INSTANCE_ID} --skip-final-snapshot"
echo ""
