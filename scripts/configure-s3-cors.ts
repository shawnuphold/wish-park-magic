import { S3Client, PutBucketCorsCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({
  region: process.env.AWS_S3_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

async function configureCors() {
  const bucket = process.env.AWS_S3_BUCKET || 'enchantedbucket';

  console.log(`Configuring CORS for bucket: ${bucket}`);

  const command = new PutBucketCorsCommand({
    Bucket: bucket,
    CORSConfiguration: {
      CORSRules: [
        {
          AllowedHeaders: ['*'],
          AllowedMethods: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
          AllowedOrigins: [
            'https://enchantedparkpickups.com',
            'https://www.enchantedparkpickups.com',
            'http://localhost:3000',
          ],
          ExposeHeaders: ['ETag'],
          MaxAgeSeconds: 3000,
        },
      ],
    },
  });

  try {
    await s3Client.send(command);
    console.log('✅ CORS configuration updated successfully!');
  } catch (error) {
    console.error('❌ Failed to update CORS:', error);
  }
}

configureCors();
