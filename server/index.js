require("dotenv").config({path:__dirname+"/.env"});
const express = require("express");
const cors = require("cors");
const {Queue} = require("bullmq");
const multer = require("multer");

// Create Queue instance from Queue Class
const queue = new Queue("pdf-upload-queue",{connection:{host:'localhost',port:6379}});

const app = express();
const PORT = 8000;
app.use(cors());

app.get("/",(req,res)=>{
 res.status(200).json({message:"This is the Home Route"});
})

app.post("/produce-sample-job",async(req,res)=>{
 //add job to the queue
 const data = {color:"green",model:1234};
 const job_name = "upload-file";
 const message = JSON.stringify(data);
 await queue.add(job_name,message);
 res.status(200).json({message:"uploaded successfully"});
})

app.listen(PORT,()=>{
console.log(`Server is running on port ${PORT}`);
})
