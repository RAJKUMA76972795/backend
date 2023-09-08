require('dotenv').config();

// spaces part  start ----------------------

const fs = require('fs');
const { S3, DeleteObjectCommand } =require("@aws-sdk/client-s3");
const { CreateBucketCommand } = require("@aws-sdk/client-s3");
const { PutObjectCommand } = require("@aws-sdk/client-s3");

const s3Client = new S3({
    endpoint: "https://nyc3.digitaloceanspaces.com",
    region: "us-east-1",
    credentials: {
      accessKeyId: process.env.DIGITALOCEAN_SPACES_ACCESS_KEY,
      secretAccessKey: process.env.DIGITALOCEAN_SPACES_SECRET_KEY
    }
});




// Specifies the new Space's name.
const bucketParams = { Bucket: "smartlive" };

// code to Create the new Space.
// const run = async () => {
//   try {
//     const data = await s3Client.send(new CreateBucketCommand(bucketParams));
//     console.log("Success", data.Location);
//     return data;
//   } catch (err) {
//     console.log("Error", err);
//   }
// };
// run();



const uploadFile = async (fileName) => {
  // Read content from the file
  const fileContent = fs.readFileSync(fileName);
  // Setting up S3 upload parameters
  const bucketParams = {
    Bucket: process.env.DIGITALOCEAN_SPACES_BUCKET_NAME,
    Key: fileName, // File name you want to save as in S3
    Body: fileContent,
    ACL:"public-read"
  };

  try {
    
    const data = await s3Client.send(new PutObjectCommand(bucketParams));
    console.log(
      `Successfully uploaded object: https://temple.nyc3.digitaloceanspaces.com/${bucketParams.Key}`
        // bucketParams.Bucket +
        // "/" +
        // bucketParams.Key
    );
    return data;
  } catch (err) {
    console.log("Error", err);
  }
};


const deleteFile = async (fileName) => {

  // Setting up S3 delete parameters
  const bucketParams = {
    Bucket: process.env.DIGITALOCEAN_SPACES_BUCKET_NAME,
    Key: fileName, // File name you want to save as in S3
  };

  // Deleting files from the bucket
  try {
    const data = await s3Client.send(new DeleteObjectCommand(bucketParams));
    console.log("Success", data);
    return data;
  } catch (err) {
    console.log("Error", err);
  }
};


const updateFile = async (oldFileName, newFileName) => {
  await deleteFile(oldFileName);
  await uploadFile(newFileName);
}


module.exports={
    uploadFile,
    deleteFile,
    updateFile
}