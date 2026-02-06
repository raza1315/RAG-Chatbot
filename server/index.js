require("dotenv").config({ path: __dirname + "/.env" });
const express = require("express");
const cors = require("cors");
const { Queue } = require("bullmq");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const { HuggingFaceInferenceEmbeddings } = require('@langchain/community/embeddings/hf');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { QdrantVectorStore } = require('@langchain/qdrant');

// Create uploads dir if not exist.
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

// Google Gemini Setup
const genAI = new GoogleGenerativeAI(process.env.LLM_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

// Create Queue instance from Queue Class
const queue = new Queue("pdf-upload-queue", { connection: { host: 'localhost', port: 6379 } });

// Multer setup
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/')
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, `${uniqueSuffix}-${file.originalname}`)
  }
});

const upload = multer({ storage: storage });

const app = express();
const PORT = 8000;
app.use(cors());

app.get("/", (req, res) => {
  res.status(200).json({ message: "This is the Home Route" });
})

app.post("/upload/file", upload.single('file'), async (req, res) => {
  //add job to the queue
  const file_name = req.file.originalname;
  const file_path = req.file.path;
  const data = { filename: file_name, path: file_path };
  const job_name = "upload-file";
  const message = JSON.stringify(data);
  await queue.add(job_name, message);
  res.status(200).json({ message: "file data uploaded to queue successfully" });
})

app.get('/chat', async (req, res) => {
  const userQuery = req.query.message;

  const embeddings = new HuggingFaceInferenceEmbeddings({
    apiKey: process.env.HUGGINGFACE_API_KEY,
    model: 'sentence-transformers/all-MiniLM-L6-v2',
  });
  const vectorStore = await QdrantVectorStore.fromExistingCollection(
    embeddings,
    {
      url: 'http://localhost:6333',
      collectionName: 'RAG-Collection',
    }
  );
  const ret = vectorStore.asRetriever({
    k: 2,
  });
  const result = await ret.invoke(userQuery);

  const SYSTEM_PROMPT = `
  You are helpfull AI Assistant who answeres the user query based on the available context from the File.
  Context:
  ${JSON.stringify(result)}
  `;

  const fullPrompt = `${SYSTEM_PROMPT}\n\nUser Query: ${userQuery}`;

  const chatResult = await model.generateContent(fullPrompt);
  const response = await chatResult.response;
  const messageContent = response.text();

  return res.json({
    message: messageContent,
    docs: result,
  });
});


app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
})
