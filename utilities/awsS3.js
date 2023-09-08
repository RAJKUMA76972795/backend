require('dotenv').config();

// aws part  start ----------------------

const AWS = require('aws-sdk');
const fs = require('fs');


const s3 = new AWS.S3({
  accessKeyId: process.env.AWSAccessKeyId,
  secretAccessKey: process.env.AWSSecretKey,
});



const uploadFile = (fileName) => {
  // Read content from the file
  const fileContent = fs.readFileSync(fileName);


  // Setting up S3 upload parameters
  const params = {
    Bucket: process.env.BUCKET_NAME,
    Key: fileName, // File name you want to save as in S3
    Body: fileContent
  };


  // Uploading files to the bucket
  s3.upload(params, function (err, data) {
    if (err) {
      throw err;
    }
    console.log(`File uploaded successfully. ${data.Location}`);
  })

};


const deleteFile = (fileName) => {

  // Setting up S3 delete parameters
  const params = {
    Bucket: process.env.BUCKET_NAME,
    Key: fileName, // File name you want to save as in S3
  };

  // Deleting files from the bucket
  s3.deleteObject(params, function (err, data) {
    if (err) {
      throw err;
    }
    console.log(`File deleted successfully. ${data.Location}`);
  });
};


const updateFile = (oldFileName, newFileName) => {
  deleteFile(oldFileName);
  uploadFile(newFileName);
}


module.exports={
    uploadFile,
    deleteFile,
    updateFile
}