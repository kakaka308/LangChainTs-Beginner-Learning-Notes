import { ChatOpenAI } from "@langchain/openai";
import * as dotenv from "dotenv";

dotenv.config();

const llm = new ChatOpenAI({
  model: "qwen3.8-27b",
  apiKey: process.env.DASHSCOPE_API_KEY,
  configuration: {
    baseURL: process.env.BASE_URL,
  },
  temperature: 0.7,
});

async function main() {
  console.log("开始调用 LLM...");

  const result = await llm.invoke("你好，请用一句话介绍一下 LCEL。");

  console.log("LLM 返回：");
  console.log(result.content);
}

main().catch(console.error);