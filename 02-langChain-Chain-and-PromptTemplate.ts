import {ChatOpenAI} from "@langchain/openai";
// 01
import { ChatPromptTemplate } from "@langchain/core/prompts";

import * as dotenv from "dotenv";
dotenv.config();

const model = new ChatOpenAI({
  apiKey: process.env.DASHSCOPE_API_KEY,
  configuration: {
    baseURL: process.env.BASE_URL,
  },
  modelName: "qwen3.8-27b",
  temperature: 0.7,
  verbose: true,
  maxTokens: 1000,
});
// 02 create Prompt Template
// const prompt = ChatPromptTemplate.fromTemplate(
//   'You are a comedian. Tell a joke based on the following wprd {input}'
// );
const prompt = ChatPromptTemplate.fromMessages([
  ["system", "Generate a joke based on a word provided by the user."],
  ["human", "{input}"],
]);


// console.log(await prompt.format({
//   input: "chicken"
// }));

// 03 create chain
const chain = prompt.pipe(model);

// 04 call chain
const res = await chain.invoke({
  input: "chicken"
})
console.log(res);



