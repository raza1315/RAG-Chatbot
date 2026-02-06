const {Worker} = require("bullmq");

const worker = new Worker(
 'pdf-upload-queue', 
 async (job)=>{
  const data = JSON.parse(job.data);
  console.log("Job Data: ",data);
 },
 {
 concurrency: 1,
 connection: {host:'localhost',port:6379}
 }
)

//Worker events: 

worker.on('completed', (job)=>{
 console.log(`Job ${job.id} completed successfully`);
})

worker.on('failed',(job,err)=>{
 console.log(`Job ${job.id} failed --> Error: ${err.message}`)
})

console.log("Worker Started and listening for jobs...")
