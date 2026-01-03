import { S3Client, PutBucketPolicyCommand, PutPublicAccessBlockCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({
  region: process.env.AWS_S3_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

async function configurePublicAccess() {
  const bucket = process.env.AWS_S3_BUCKET || 'enchantedbucket';

  console.log(`Configuring public read access for bucket: ${bucket}`);

  // First, disable the public access block
  try {
    const blockCommand = new PutPublicAccessBlockCommand({
      Bucket: bucket,
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: false,
        IgnorePublicAcls: false,
        BlockPublicPolicy: false,
        RestrictPublicBuckets: false,
      },
    });
    await s3Client.send(blockCommand);
    console.log('✅ Public access block disabled');
  } catch (error) {
    console.error('Warning: Could not update public access block:', error);
  }

  // Then add a bucket policy allowing public read
  const policy = {
    Version: '2012-10-17',
    Statement: [
      {
        Sid: 'PublicReadGetObject',
        Effect: 'Allow',
        Principal: '*',
        Action: 's3:GetObject',
        Resource: `arn:aws:s3:::${bucket}/*`,
      },
    ],
  };

  try {
    const policyCommand = new PutBucketPolicyCommand({
      Bucket: bucket,
      Policy: JSON.stringify(policy),
    });
    await s3Client.send(policyCommand);
    console.log('✅ Bucket policy updated - images are now publicly readable!');
  } catch (error) {
    console.error('❌ Failed to update bucket policy:', error);
  }
}

configurePublicAccess();
