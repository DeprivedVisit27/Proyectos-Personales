const { S3Client, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');

const s3 = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
const bucket = process.env.AWS_BUCKET || 'mi-web-pro-users';
const key = 'users.json';

async function getUsers() {
  try {
    const command = new GetObjectCommand({ Bucket: bucket, Key: key });
    const response = await s3.send(command);
    const data = await response.Body.transformToString();
    return JSON.parse(data);
  } catch (error) {
    console.error('Error getting users from S3:', error);
    return [];
  }
}

async function addUser(user) {
  try {
    const users = await getUsers();
    users.push(user);
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: JSON.stringify(users),
      ContentType: 'application/json'
    });
    await s3.send(command);
    console.log('User added to S3');
  } catch (error) {
    console.error('Error adding user to S3:', error);
  }
}

module.exports = { getUsers, addUser };