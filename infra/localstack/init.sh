#!/bin/bash
# Runs from /etc/localstack/init/ready.d, so S3 and SQS are already up.
set -euo pipefail

REGION=us-east-1
BUCKET=fiscaliza-photos
QUEUE=fiscaliza-inspections
DLQ=fiscaliza-inspections-dlq
WEB_ORIGIN=http://localhost:5173

awslocal s3api create-bucket --bucket "$BUCKET" --region "$REGION"

# Photos are uploaded straight from the browser with presigned URLs (spec 003)
awslocal s3api put-bucket-cors --bucket "$BUCKET" --cors-configuration "{
  \"CORSRules\": [{
    \"AllowedOrigins\": [\"$WEB_ORIGIN\"],
    \"AllowedMethods\": [\"PUT\", \"GET\"],
    \"AllowedHeaders\": [\"*\"],
    \"ExposeHeaders\": [\"ETag\"],
    \"MaxAgeSeconds\": 3000
  }]
}"

DLQ_URL=$(awslocal sqs create-queue --queue-name "$DLQ" --query QueueUrl --output text)
DLQ_ARN=$(awslocal sqs get-queue-attributes --queue-url "$DLQ_URL" \
  --attribute-names QueueArn --query Attributes.QueueArn --output text)

awslocal sqs create-queue --queue-name "$QUEUE" --attributes "{
  \"VisibilityTimeout\": \"120\",
  \"RedrivePolicy\": \"{\\\"deadLetterTargetArn\\\":\\\"$DLQ_ARN\\\",\\\"maxReceiveCount\\\":\\\"3\\\"}\"
}"

echo "LocalStack ready: bucket $BUCKET, queue $QUEUE with DLQ $DLQ (maxReceiveCount 3)"
