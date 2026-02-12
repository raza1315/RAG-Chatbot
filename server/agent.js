// Create Ai Agent with basic tools 
require("dotenv").config({ path: __dirname + "/.env" });
const { ChatOpenAI } = require("@langchain/openai");
const { createAgent, tool, HumanMessage } = require("langchain");
const z = require("zod");

// Create model instance of open ai gpt-4.1-mini
// ModelClass({model,apiKey,...options})
const model = new ChatOpenAI({
    model: "gpt-4.1-mini",
    apiKey: process.env.OPENAI_API_KEY,
})

// Create a tools
// tool(function,{name,description,schema})
const testTool = tool(
    ({ name }) => { return `Hello ${name}, this is a test tool! Rizzz` },
    {
        name: "testTool",
        description: "A tool to test the agent's ability to use tools.",
        schema: z.object({ name: z.string().describe("The name of the person to greet.") })
    },
)

const handOffToHumanTool = tool(
    ({ name }) => { return `Sure ${name} I will hand off this conversation to a human agent. Please wait while I connect you.` },
    {
        name: "handOffToHumanTool",
        description: "A tool to hand off the conversation to a human agent.",
        schema: z.object({ name: z.string().describe("The name of the client who needs help.") })
    }
)

const tools = [testTool, handOffToHumanTool];

// Create agent with model and tools
// createAgent({model,tools,systemPrompt})
const agent = createAgent({ model, tools, systemPrompt: "You are a helpful assistant. Use tools when appropriate." });

// Run the agent with a prompt
(async () => {
    const testQuery = new HumanMessage("hey I want to talk to a person");
    const messages = [testQuery];
    const response = await agent.invoke({ messages });
    console.log(response);
})();