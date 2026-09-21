import { ChatOpenAI } from "@langchain/openai"
import { OllamaEmbeddings } from "@langchain/ollama";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts"
import { Document } from "@langchain/core/documents"
import { createStuffDocumentsChain } from "@langchain/classic/chains/combine_documents"
// import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { createRetrievalChain } from "@langchain/classic/chains/retrieval";
import { createHistoryAwareRetriever } from "@langchain/classic/chains/history_aware_retriever"
import { PGVectorStore } from "@langchain/community/vectorstores/pgvector";
import { BaseMessage, HumanMessage, AIMessage } from "@langchain/core/messages"
import * as dotenv from "dotenv";
dotenv.config();

// 01 常量 类型定义
type ChatHistory = BaseMessage[];
const  CONFIG = {
  llmName: "qwen3.8-27b",
  llmApiKey: process.env.DASHSCOPE_API_KEY,
  llmBaseURL: process.env.BASE_URL,
  embeddingModelName: "bge-m3:latest",
  dbUrl: process.env.DATABASE_URL,
  vectorTableName: "langchain_vectors",
};
// 02 初始化
const llm = new ChatOpenAI({
  model: CONFIG.llmName,
  apiKey: CONFIG.llmApiKey,
  configuration: { baseURL:CONFIG.llmBaseURL },
  temperature: 0.7,
});
const baseEmbeddings = new OllamaEmbeddings({
  model: CONFIG.embeddingModelName,
  baseUrl: "http://127.0.0.1:11434",
});


const embeddings = {
  ...baseEmbeddings,
  embedDocuments: (texts: string[]) => baseEmbeddings.embedDocuments(texts),
  embedQuery: async (text: any) => {
    const queryStr = typeof text === "string" ? text : String(text?.text || text);
    return baseEmbeddings.embedQuery(queryStr);
  },
};
// 03 向量存储
async function initVectorStore(rawDocs: Document[]): Promise<PGVectorStore> {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 500,
    chunkOverlap: 50,
  });
  const splitDocs = await splitter.splitDocuments(rawDocs);
  const pgConfig = {
    postgresConnectionOptions: {
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME ,
    },
    tableName: CONFIG.vectorTableName
  }
  return PGVectorStore.fromDocuments(splitDocs, embeddings,pgConfig);
}
// 04 RAG 检索链
async function buildRAGConversationChain(vectorStore: PGVectorStore) {
  
  const retriever = vectorStore.asRetriever({ k: 2 });
  const rephrasePrompt = ChatPromptTemplate.fromMessages([ 
    new MessagesPlaceholder("chat_history"),
    ["user", "{input}"],
    ["user", "基于上述对话历史，生成一个在向量库中查找相关内容的检索词。"],
  ]);
  const historyAwareRetriever = await createHistoryAwareRetriever({
    llm,
    retriever,
    rephrasePrompt
  });

  const qaPromt = ChatPromptTemplate.fromMessages([
    [
      "system",
      "请根据上下文的内容回答用户的询问： {context} "
    ],
    new MessagesPlaceholder("chat_history"),
    [
      "user",
      "{input}"
    ]
  ]);
  const combineDocsChain = await createStuffDocumentsChain({
    llm,
    prompt: qaPromt,
  });

  return createRetrievalChain({
    combineDocsChain,
    retriever: historyAwareRetriever,
  });
}
// 05 执行入口
async function main() {
  // 测试文档 历史记录
  const mockDocs = [
    new Document({
      pageContent: "LCEL (LangChain Expression Language) 是 LangChain 的声明式表达语言，支持流式传输与异步调用。",
      metadata: { source: "local_knowledge" },
    }),
  ];
  const ChatHistory: ChatHistory = [
    new HumanMessage("什么是LCEL？"),
    new AIMessage("LCEL 代表 LangChain Expression Language."),
  ];
  // 向量库 对话链
  const vectorStore = await initVectorStore(mockDocs);
  const ragChain = await buildRAGConversationChain(vectorStore);
  // 执行问答
  const res = await ragChain.invoke({
    chat_history: ChatHistory,
    input: "它有什么核心特点？",
  });
  console.log(res.answer);
  
  process.exit(0);
}

main().catch(console.error);