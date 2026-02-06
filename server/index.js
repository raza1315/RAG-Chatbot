require("dotenv").config({path:__dirname+"/.env"});
const express = require("express");
const cors = require("cors");
const {Queue} = require("bullmq");
const multer = require("multer");

const app = express();
const PORT = 8000;
app.use(cors());

app.get("/",(req,res)=>{
 res.status(200).json({message:"This is the Home Route"});
})

app.listen(PORT,()=>{
console.log(`Server is running on port ${PORT}`);
})
