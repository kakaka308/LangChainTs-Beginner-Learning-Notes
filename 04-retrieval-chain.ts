import { ChatOpenAI } from "@langchain/openai"
import { OllamaEmbeddings } from "@langchain/ollama";
import { ChatPromptTemplate } from "@langchain/core/prompts"
import { Document } from "@langchain/core/documents"
import { createStuffDocumentsChain } from "@langchain/classic/chains/combine_documents"
import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { createRetrievalChain } from "@langchain/classic/chains/retrieval";
import { PGVectorStore } from "@langchain/community/vectorstores/pgvector";

import * as dotenv from "dotenv";
dotenv.config();

async function main(): Promise<void> {
  // 01 实例化llm
  const model = new ChatOpenAI({
    model: "qwen3.8-27b",
    temperature: 0.7,
    apiKey: process.env.DASHSCOPE_API_KEY,
    configuration: {
      baseURL: process.env.BASE_URL,
    },
  });
  // 02 prompt模版
  const prompt = ChatPromptTemplate.fromTemplate(`
  Answer the user's question.

  Context:
  {context}

  Question:
  {input}
  `);
  // 03 文档组合链
  const chain = await createStuffDocumentsChain({
    llm: model,
    prompt,
  });
  // 04 Cheerio 加载器抓取目标网页内容
  const loader = new CheerioWebBaseLoader(
    "https://raw.githubusercontent.com/langchain-ai/langchain/master/README.md"
  );
  const docs = await loader.load();
  // console.log("docs", docs);
  // 05 文本分割器
  const splitter: RecursiveCharacterTextSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 600,
    chunkOverlap: 20,
  })
  const splitDocs: Document[] = await splitter.splitDocuments(docs);
  // console.log("splitDocs", splitDocs);
  // 06 实例化向量嵌入模型
  const embeddings = new OllamaEmbeddings({
      model: "bge-m3:latest",
  });
  // 07 连接数据库
  const pgConfig = {
    postgresConnectionOptions: {
      host: process.env.DB_HOST || "127.0.0.1",
      port: Number(process.env.DB_PORT) || 5432,
      user: process.env.DB_USER || "postgres",
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || "mydb",
    },
    tableName: "bge_m3_vectors"
  }
  // 08 存入向量数据库
  const vectorstore = await PGVectorStore.fromDocuments(
    splitDocs,
    embeddings,
    pgConfig
  );
  // 09 创建检索链并回答
  const retriever = vectorstore.asRetriever({ k: 2 });
  const retrievalChain = await createRetrievalChain({
    combineDocsChain: chain,
    retriever
  });
  // 10
  const res = await retrievalChain.invoke({
    input: "What is LCEL?",
  });
  // 11
  console.log("回答结果：", res.answer);
  // 12 关闭连接池
  await vectorstore.end();
}

main().catch(console.error);




