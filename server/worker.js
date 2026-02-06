require("dotenv").config({path:__dirname+"/.env"});
const { Worker } = require("bullmq");
const { HuggingFaceInferenceEmbeddings } = require('@langchain/community/embeddings/hf');
const { QdrantVectorStore } = require('@langchain/qdrant');
const { Document } = require('@langchain/core/documents')
const { DocxLoader } = require('@langchain/community/document_loaders/fs/docx');

const worker = new Worker(
    'pdf-upload-queue',
    async (job) => {
        try {
            console.log(`Processing Job:`, job.data);
            const data = JSON.parse(job.data);

            // Verify API key
            if (!process.env.EMBEDDING_API_KEY) {
                throw new Error('EMBEDDING_API_KEY environment variable is not set!');
            }
            console.log(`✓ Embedding API key is configured`);

            // Load document
            console.log(`Loading document from: ${data.path}`);
            let loader;
            if (data.path.toLowerCase().endsWith('.docx') || data.path.toLowerCase().endsWith('.doc')) {
                loader = new DocxLoader(data.path);
            } else {
                console.warn(`⚠️ Unsupported file type for path: ${data.path}. Only .docx and .doc are supported.`);
                return;
            }
            const docs = await loader.load();
            console.log(`Document loaded with ${docs.length} pages/sections`);

            // Extract and split by --##-- delimiter
            console.log(`Splitting document by '--##--' delimiter...`);
            const fullText = docs.map((d) => (d.pageContent || d.content || '')).join('\n');

            // Split by --##-- delimiter (with optional whitespace around it)
            let qaChunks = fullText.split(/\s*--##--\s*/);

            // Clean up chunks - remove empty ones and trim whitespace
            qaChunks = qaChunks
                .map(chunk => chunk.trim())
                .filter(chunk => chunk.length > 0);

            console.log(`Document split into ${qaChunks.length} docs based on '--##--' delimiter`);

            // Log first few chunks to verify
            console.log('\n=== First 3 Chunks (Preview) ===');
            qaChunks.slice(0, 3).forEach((chunk, idx) => {
                console.log(`\n--- Chunk ${idx + 1} ---`);
                console.log(chunk.substring(0, 500) + (chunk.length > 500 ? '...' : ''));
                console.log(`Length: ${chunk.length} characters`);
            });
            console.log('\n=====================================\n');

            // Convert to Document objects
            const splitDocs = qaChunks.map((chunk, index) =>
                new Document({
                    pageContent: chunk,
                    metadata: {
                        ...docs[0]?.metadata,
                        chunkIndex: index,
                        totalChunks: qaChunks.length,
                        source: data.path
                    }
                })
            );

            // Initialize embeddings
            console.log(`Initializing HuggingFace embeddings...`);
            const embeddings = new HuggingFaceInferenceEmbeddings({
                apiKey: process.env.EMBEDDING_API_KEY,
                // model: 'model name here if needed, otherwise default will be used'
            });
            console.log(`✓ Embeddings initialized`);

            // Connect to Qdrant
            console.log(`Connecting to Qdrant at http://localhost:6333...`);
            const vectorStore = await QdrantVectorStore.fromExistingCollection(
                embeddings,
                {
                    url: 'http://localhost:6333',
                    collectionName: 'RAG-Collection',
                }
            );
            console.log(`✓ Connected to Qdrant`);

            // Add documents to vector store
            console.log(`Adding ${splitDocs.length} docs to vector store...`);
            await vectorStore.addDocuments(splitDocs);
            console.log(`✓ All ${splitDocs.length} docs added to Qdrant successfully!`);

            // Summary
            console.log('\n=== Processing Summary ===');
            console.log(`Total docs stored: ${splitDocs.length}`);
            console.log(`Collection: RAG-Collection`);
            console.log(`Source file: ${data.path}`);
            console.log('==========================\n');

        } catch (error) {
            console.error(`❌ Error processing document:`, error.message);
        }
    },
    {
        concurrency: 1,
        connection: { host: 'localhost', port: 6379 }
    }
)

//Worker events: 

worker.on('completed', (job) => {
    console.log(`Job ${job.id} completed successfully`);
})

worker.on('failed', (job, err) => {
    console.log(`Job ${job.id} failed --> Error: ${err.message}`)
})

console.log("Worker Started and listening for jobs...")
