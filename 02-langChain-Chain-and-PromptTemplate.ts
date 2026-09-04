import {ChatOpenAI} from "@langchain/openai";
// 01
import { ChatPromptTemplate } from "@langchain/core/prompts";

import * as dotenv from "dotenv";
dotenv.config();

const model = new ChatOpenAI({
  apiKey: "sk-ws-H.PMRRYHX.gwPG.MEQCIHYvLFKWJQL5ImidMwsZtRFibq3AWZi4JXsajb7yoo2TAiA7qymfmHsV646MQvLCIcOra0iBsIw0FgA2nAhO9IsQsg",
  configuration: {
    baseURL: "https://llm-bf3gyz3ire42nhe5.cn-beijing.maas.aliyuncs.com/compatible-mode/v1",  // 阿里云百炼提供的 OpenAI 兼容地址
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



