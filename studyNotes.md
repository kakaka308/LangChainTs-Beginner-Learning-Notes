# studyNotes

## 05 多轮历史对话 + 向量检索
### 三个核心问题
#### 一、ResponseError: invalid input type (HTTP 400)
Ollama 本地服务端拒收了请求，提示“传入的数据类型无效”。

原因：
在最新版的原生 ollama SDK 中，embed 接口要求传入的数据必须是规范的 input 字段。而当 LangChain 的 createHistoryAwareRetriever 运行重写链时，生成的新查询词（Query）被包装成了对象或特殊格式，透传给 OllamaEmbeddings.embedQuery() 时，由于数据类型不匹配直接导致 Ollama 服务端抛出 400 错误。

现象：
- 在运行到ragChain.invoke 阶段时，控制台抛出 Ollama 底层 SDK 的 400 invalid input type 报错。
存入向量库时正常（因为存入传的是字符串数组 string[]），只有在调用完整对话链检索时报错。

排查过程：
1. 插入 console.log 阶段调试，发现PGVectorStore.fromDocuments 批量写入）顺利通过，
=》
批量传入 string[] 生成向量是没有问题的。
2. 拆解调试 单独调用 vectorStore.asRetriever().invoke("纯字符串") 可以正常检索。
3. 问题出在 createHistoryAwareRetriever（历史感知检索器）。大模型将对话历史改写后生成的 Query，在传入 OllamaEmbeddings.embedQuery() 时，其数据结构被 LangChain 封装为了复杂对象（或非纯 string），触发了 Ollama 服务端的类型拦截。


最终解决：
拦截嵌入入参（防御 400 错误）
```
const baseEmbeddings = new OllamaEmbeddings({
  model: CONFIG.embeddingModelName,
  baseUrl: "http://127.0.0.1:11434",
});

// 兜底拦截：确保不管上游链传进来什么对象，最终扔给 Ollama 的都是纯 string
const embeddings = {
  ...baseEmbeddings,
  embedDocuments: (texts: string[]) => baseEmbeddings.embedDocuments(texts),
  embedQuery: async (text: any) => {
    const queryStr = typeof text === "string" ? text : String(text?.text || text);
    return baseEmbeddings.embedQuery(queryStr);
  },
};
```

#### 二、终端卡死
终端程序没有执行完，也不抛异常，一直停在 ◇ injected env 或某个 Log。

原因：
- 前期卡死： 是因为 LangChain 内部有 p-retry（自动重发）机制。当遇到上述 400 错误或网络超时时，它在后台不断重试，导致程序看起来像卡死了一样。
- 后期卡死：是因为 PostgreSQL 数据库连接池（pg pool）和 HTTP 长连接在后台保持 active。Node.js 的事件循环（Event Loop）检测到有未断开的 Socket 句柄，因此进程不会主动退出。

最终解决：
在 main() 结尾补充，主动释放 PGVector 数据库连接池
process.exit(0);

#### 三、找不到模块 ... 或其相应的类型声明 (TS2307)
TypeScript 编译器在 node_modules 中找不到对应路径的代码或类型文件。

原因：
（ LangChain v1.x 架构重构）
LangChain 近期推出了 v1.x 正式版，把大部分经典链（createStuffDocumentsChain、createRetrievalChain 等）从主包剥离转移到了新包 @langchain/classic 中。直接按照旧教程写 langchain/chains/xxx 就会触发 TS 找不到路径。

最终解决：
```
// 统一使用 @langchain/classic 路径导入辅助链
import { createStuffDocumentsChain } from "@langchain/classic/chains/combine_documents";
import { createRetrievalChain } from "@langchain/classic/chains/retrieval";
import { createHistoryAwareRetriever } from "@langchain/classic/chains/history_aware_retriever";
```