// 01 终端 npm int -y 初始化一个node项目 生成package.json

// 02 npm install langchain @langchain/openai
import {ChatOpenAI} from "@langchain/openai";

// 03 npm install dotenv 加载环境变量
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

const res = await model.invoke('hi');
// const res = await model.batch(["hi","how are you?"]);
console.log(res);
// const res = await model.stream("write a poem about AI");
// for await (const chunk of res) {
//   console.log(chunk?.content);
// }



