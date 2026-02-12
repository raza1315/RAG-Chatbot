// const { ChatGoogleGenerativeAI } = require("@langchain/google-genai")
const { ChatOpenAI } = require("@langchain/openai")
const { AIMessage } = require("langchain")
const ChatBotResponse = async (conversation) => {
    try {
        // const model = new ChatGoogleGenerativeAI({
        //     model: "gemini-2.5-flash",
        //     apiKey: process.env.LLM_API_KEY,
        // })
        const model = new ChatOpenAI({
            modelName: "gpt-4.1-mini",
            openAIApiKey: process.env.OPENAI_API_KEY,
        })
        const response = await model.invoke(conversation);
        const ai_response = new AIMessage(response.content);
        conversation.push(ai_response);
        console.log("conversation: ", conversation);
        return { status: "success", message: response.content };
    }
    catch (error) {
        console.error("Error in ChatBotResponse:", error);
        return { status: "error", message: error.message };
    }
}
module.exports = { ChatBotResponse };