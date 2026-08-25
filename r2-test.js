const { S3Client, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');

// These credentials will be pulled from your environment variables
const client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

async function run() {
  const key = 'test-upload.txt';
  const bucket = process.env.R2_BUCKET_NAME;
  try {
    console.log('Testing bucket: ' + bucket);
    
    // 1. Upload
    await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: 'Hello World', ContentType: 'text/plain' }));
    console.log('✅ Upload successful');

    // 2. Verify existence
    await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    console.log('✅ Verification successful');

    // 3. Delete
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    console.log('✅ Delete successful');
  } catch (err) {
    console.error('❌ Error: ' + err.message);
  }
}

run();
