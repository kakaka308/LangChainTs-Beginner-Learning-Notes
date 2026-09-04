import {ChatOpenAI} from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
// 01 
import { CommaSeparatedListOutputParser, StringOutputParser, StructuredOutputParser } from "@langchain/core/output_parsers"
// 01 npm install zod
import { z } from "zod";

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
// 02 StringOutputParser
async function callStringOutputParser(): Promise<string> {
 const prompt = ChatPromptTemplate.fromTemplate("Tell a joke about {word}.");

  // 03 create Parser
  const parser = new StringOutputParser();
  // 04 Prompt -> Model -> Parser
  const chain = prompt.pipe(model).pipe(parser); 
  return await chain.invoke({ word: "dog" });
}

// 05 Comma Separated List Output Parser
async function callListOutputParser(): Promise<string[]> {
  const prompt = ChatPromptTemplate.fromMessages([
    ["system", "Generate a joke based on a word provided by the user."],
    ["human", "{input}"],
  ]);
  const parser = new CommaSeparatedListOutputParser();
  const chain = prompt.pipe(model).pipe(parser); 
  return await chain.invoke({
    input: "chicken"
  })
}

// 06 Structured Output Parser(fromNamesAndDescriptions)
async function callStructuredParser(): Promise<Record<string, any>> {
  const prompt = ChatPromptTemplate.fromTemplate(
    "Extract information from the following phrase.\n{format_instructions}\n{phrase}"
  );
  
  const parser = StructuredOutputParser.fromNamesAndDescriptions({
    name: "name of the person",
    age: "age of person",
  });
  const chain = prompt.pipe(model).pipe(parser); 
  return await chain.invoke({
    phrase: "Max is 30 years old",
    format_instructions: parser.getFormatInstructions(),
  });
}

// 07 Structured Output Parser(fromZodSchema)
const RecipeSchema = z.object({
  recipe: z.string().describe("name of recipe"),
  ingredients: z.array(z.string()).describe("ingredients"),
});
type RecipeOutput = z.infer<typeof RecipeSchema>;
async function callZodStructuredParser(): Promise<RecipeOutput> {
  const prompt = ChatPromptTemplate.fromTemplate(
    "Extract information from the following phrase.{format_instructions}\n{phrase}"
  );
  const parser = StructuredOutputParser.fromZodSchema(RecipeSchema);
  const chain = prompt.pipe(model).pipe(parser);
  return await chain.invoke({
    phrase: "Max is 30 years old",
    format_instructions: parser.getFormatInstructions(),
  });
}

// const res = await callStringOutputParser();
// const res = await callListOutputParser();
// const res = await callStructuredParser();
const res = await callZodStructuredParser();
console.log(res);



