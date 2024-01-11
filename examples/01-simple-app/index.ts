import { PromptTemplate } from "@langchain/core/prompts";
import { BufferMemory } from "langchain/memory";
// @ts-ignore
import { GptGo } from "gpt4free-typescript";
import { LLMChain } from "langchain/chains";
import { createInterface } from "readline/promises";

const serializeChatHistory = (chatHistory: string | Array<string>) => {
  if (Array.isArray(chatHistory)) {
    return chatHistory.join("\n");
  }
  return chatHistory;
};

const model = new GptGo();
const memory = new BufferMemory({
  memoryKey: "chatHistory",
});
const prompt = PromptTemplate.fromTemplate(
  `Use the following pieces of context to answer the question at the end. If you don't know the answer, just say that you don't know, don't try to make up an answer.
----------------
CHAT HISTORY: {chatHistory}
----------------
QUESTION: {question}
----------------
Helpful Answer:`
);

const chain = new LLMChain({
  llm: model,
  prompt,
});

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
});

console.log('Bot: Hello! How can I assist you today? (Type "exit" to quit)');

const run = async () => {
  let question;
  do {
    question = await rl.question("You: ");
    if (question != "exit") {
      const memoryResult = await memory.loadMemoryVariables({});
      const { text } = await chain.call({
        question,
        chatHistory: serializeChatHistory(memoryResult.chatHistory ?? ""),
      });
      console.log(`Bot: ${text}`);
      await memory.saveContext(
        {
          human: question,
        },
        {
          ai: text,
        }
      );
    }
  } while (question != "exit");
};

run();
