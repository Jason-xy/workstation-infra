// ============================================================================
// AutoClaw Codex 翻译代理
// ============================================================================
//
// 【这个脚本是干什么的】
//   AutoClaw 和中转站的 Codex 端口"语言不通"，这个脚本当翻译。
//   AutoClaw 只会说 Chat Completions 格式（OpenAI 传统接口）
//   中转站 /codex 只听 Responses API 格式（OpenAI 新接口）
//   本代理在本地监听 18801 端口，实时在两种格式之间做翻译。
//
// 【为什么需要它】
//   直接把中转站 URL 填进 AutoClaw 会报 404，因为 AutoClaw 发的请求格式
//   中转站根本不认识。这不是 Key 的问题，也不是 URL 的问题，是协议不兼容。
//   Claude 没这个问题，因为 AutoClaw 内置了 Anthropic 协议。
//
// 【怎么用】
//   1. 确保电脑装了 Node.js（装过 OpenClaw 的话已经有了）
//   2. 运行此脚本: node codex-autoclaw-proxy.mjs
//   3. AutoClaw 添加模型时 Base URL 填: http://127.0.0.1:18801/v1
//   4. API 协议选 OpenAI（默认就是，不用改）
//   5. 脚本保持运行即可，关机后下次开机需要重新运行
//
// 【请求翻译流程】
//   AutoClaw 发送:
//     POST /v1/chat/completions
//     { "model": "gpt-5-codex", "messages": [...], "stream": true }
//
//   代理转换成:
//     POST /codex/v1/responses
//     { "model": "gpt-5-codex", "input": [...], "stream": true, "store": false }
//
//   转换细节:
//     ① messages → input（字段名不同）
//     ② role:"system" 的消息 → instructions 字段
//        （Responses API 不允许 input 里有 system 消息）
//     ③ 用户消息的 content type: "text" → "input_text"
//        （Responses API 用 input_text 不用 text）
//     ④ 助手消息的 content type: "text" → "output_text"
//        （Responses API 区分输入和输出的内容类型）
//     ⑤ 每条消息加上 type: "message"
//        （Responses API 要求显式声明消息类型）
//     ⑥ 永远 store: false
//        （中转站不支持响应持久化）
//
//   响应翻译流程（反方向）:
//     中转站返回 Responses API SSE 事件:
//       event: response.output_text.delta  →  转成 Chat Completions delta
//       event: response.completed          →  转成 finish_reason: "stop"
//
// 【本脚本跨平台】
//   Windows / macOS / Linux 都能直接用，Node.js 是跨平台的。
//   唯一区别是启动命令:
//     Windows:  node codex-autoclaw-proxy.mjs（或双击 .bat）
//     macOS:    node codex-autoclaw-proxy.mjs（终端运行）
//     Linux:    node codex-autoclaw-proxy.mjs（终端运行）
//
// ============================================================================

import http from "node:http";
import https from "node:https";

const LOCAL_PORT = Number(process.env.LOCAL_PORT || 18801);
const BIND_HOST = process.env.BIND_HOST || "0.0.0.0";
const BASE_URL = process.env.BASE_URL || "https://chat.nuoda.vip/codex/v1/responses";
const API_KEY = process.env.API_KEY || "";
const MODEL_LIST = (process.env.MODELS || "gpt-5-codex,gpt-5,gpt-5.4,gpt-5.1,gpt-5.2")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const upstreamUrl = new URL(BASE_URL);
const requestLib = upstreamUrl.protocol === "http:" ? http : https;

function getAuthorizationHeader(reqAuthHeader) {
  if (reqAuthHeader) return reqAuthHeader;
  if (!API_KEY) return null;
  return API_KEY.startsWith("Bearer ") ? API_KEY : `Bearer ${API_KEY}`;
}

// ── 消息格式转换 ──
// Chat Completions 格式:  { role: "user", content: "你好" }
// Responses API 格式:     { type: "message", role: "user", content: [{ type: "input_text", text: "你好" }] }
// 两个 API 看着像，但细节全不一样，差一个字段都会 400
function convertMessages(messages) {
  if (!Array.isArray(messages)) return [];
  return messages.map((msg) => {
    const role = msg.role || "user";
    const item = { type: "message", role };

    // 关键区别: 用户消息用 input_text，助手消息用 output_text
    // 搞反了就报 "Invalid value: 'input_text'. Supported values are: 'output_text'"
    const textType = role === "assistant" ? "output_text" : "input_text";

    if (typeof msg.content === "string") {
      item.content = [{ type: textType, text: msg.content }];
    } else if (Array.isArray(msg.content)) {
      item.content = msg.content.map((part) => {
        if (part.type === "text" || part.type === "input_text" || part.type === "output_text") {
          return { type: textType, text: part.text };
        }
        if (part.type === "image_url") return { type: "input_image", image_url: part.image_url };
        return part;
      });
    } else {
      item.content = [{ type: textType, text: String(msg.content || "") }];
    }
    return item;
  });
}

// ── 请求体转换 ──
function convertToResponsesAPI(chatReq) {
  const messages = chatReq.messages || [];

  // Responses API 不允许 input 里有 system 消息
  // 必须把 system 内容提取出来放到 instructions 字段
  // 否则报 "System messages are not allowed"
  const systemMsgs = messages.filter((m) => m.role === "system");
  const nonSystemMsgs = messages.filter((m) => m.role !== "system");

  const resp = {
    model: chatReq.model,
    input: convertMessages(nonSystemMsgs),
    stream: true,  // 永远用流式请求，因为中转站可能强制返回流式
    store: false    // 中转站不支持响应持久化，必须 false
  };

  if (systemMsgs.length > 0) {
    resp.instructions = systemMsgs
      .map((m) => (typeof m.content === "string" ? m.content : JSON.stringify(m.content)))
      .join("\n");
  }

  if (chatReq.temperature !== undefined) resp.temperature = chatReq.temperature;
  if (chatReq.max_tokens !== undefined) resp.max_output_tokens = chatReq.max_tokens;
  if (chatReq.top_p !== undefined) resp.top_p = chatReq.top_p;
  return resp;
}

// ── 流式响应转换（Responses API SSE → Chat Completions SSE）──
function handleStreaming(res, upstream, model) {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive"
  });

  const respId = "chatcmpl-" + Date.now();
  let buffer = "";
  let sentRole = false;

  upstream.on("data", (chunk) => {
    buffer += chunk.toString();
    const lines = buffer.split("\n");
    buffer = lines.pop();

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6).trim();
      if (!data || data === "[DONE]") continue;

      try {
        const evt = JSON.parse(data);

        // 文本增量: Responses API 的 delta 事件 → Chat Completions 的 chunk
        if (evt.type === "response.output_text.delta" && evt.delta) {
          const delta = sentRole
            ? { content: evt.delta }
            : { role: "assistant", content: evt.delta };
          sentRole = true;

          res.write(`data: ${JSON.stringify({
            id: respId,
            object: "chat.completion.chunk",
            created: Math.floor(Date.now() / 1000),
            model,
            choices: [{ index: 0, delta, finish_reason: null }]
          })}\n\n`);
        }

        // 完成事件: 发送 finish_reason: "stop" + [DONE]
        if (evt.type === "response.completed") {
          res.write(`data: ${JSON.stringify({
            id: respId,
            object: "chat.completion.chunk",
            created: Math.floor(Date.now() / 1000),
            model,
            choices: [{ index: 0, delta: {}, finish_reason: "stop" }]
          })}\n\n`);
          res.write("data: [DONE]\n\n");
        }
      } catch {}
    }
  });

  upstream.on("end", () => res.end());
  upstream.on("error", () => res.end());
}

// ── 非流式响应转换（用于连通测试等场景）──
// 即使请求 stream:false，中转站也可能返回 SSE 格式
// 所以这里统一从 SSE 流中提取文本，拼成完整的 Chat Completions JSON 返回
function handleNonStreaming(res, upstream, model) {
  let buffer = "";
  let content = "";
  let usage = null;

  upstream.on("data", (chunk) => {
    buffer += chunk.toString();
    const lines = buffer.split("\n");
    buffer = lines.pop();

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6).trim();
      if (!data || data === "[DONE]") continue;
      try {
        const evt = JSON.parse(data);
        if (evt.type === "response.output_text.delta" && evt.delta) {
          content += evt.delta;
        }
        if (evt.type === "response.completed" && evt.response && evt.response.usage) {
          usage = evt.response.usage;
        }
      } catch {}
    }
  });

  upstream.on("end", () => {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      id: "chatcmpl-" + Date.now(),
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model,
      choices: [{
        index: 0,
        message: { role: "assistant", content },
        finish_reason: "stop"
      }],
      usage: usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
    }));
  });

  upstream.on("error", () => {
    if (!res.headersSent) res.writeHead(502);
    res.end("upstream error");
  });
}

// ── HTTP 服务器 ──
const server = http.createServer((req, res) => {
  // AutoClaw 可能请求 /v1/models 做连通检测，返回模型列表即可
  if (req.method === "GET" && req.url.includes("/models")) {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      object: "list",
      data: MODEL_LIST.map((id) => ({ id, object: "model", owned_by: "proxy" }))
    }));
    return;
  }

  // 只处理 Chat Completions 请求，其他路径返回 404
  if (req.method !== "POST" || !req.url.includes("/chat/completions")) {
    res.writeHead(404);
    res.end("Only /v1/chat/completions is supported");
    return;
  }

  const reqChunks = [];
  req.on("data", (c) => reqChunks.push(c));
  req.on("end", () => {
    let chatReq;
    try {
      chatReq = JSON.parse(Buffer.concat(reqChunks).toString());
    } catch {
      res.writeHead(400);
      res.end("Invalid JSON");
      return;
    }

    const responsesBody = JSON.stringify(convertToResponsesAPI(chatReq));

    const headers = {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(responsesBody),
      "Host": upstreamUrl.host
    };
    // 优先转发客户端 Authorization；未提供时回退到 .env 中的 API_KEY
    const authHeader = getAuthorizationHeader(req.headers.authorization);
    if (authHeader) headers["Authorization"] = authHeader;

    const opts = {
      protocol: upstreamUrl.protocol,
      hostname: upstreamUrl.hostname,
      port: upstreamUrl.port || (upstreamUrl.protocol === "http:" ? 80 : 443),
      path: upstreamUrl.pathname + upstreamUrl.search,
      method: "POST",
      headers
    };

    const proxy = requestLib.request(opts, (upstream) => {
      if (upstream.statusCode !== 200) {
        res.writeHead(upstream.statusCode, { "Content-Type": upstream.headers["content-type"] || "text/plain" });
        upstream.pipe(res);
        return;
      }

      if (chatReq.stream) {
        handleStreaming(res, upstream, chatReq.model);
      } else {
        handleNonStreaming(res, upstream, chatReq.model);
      }
    });

    proxy.on("error", (e) => {
      if (!res.headersSent) res.writeHead(502);
      res.end(e.message);
    });
    proxy.setTimeout(120000, () => {
      proxy.destroy();
      if (!res.headersSent) res.writeHead(504);
      res.end("timeout");
    });
    proxy.end(responsesBody);
  });
});

server.listen(LOCAL_PORT, BIND_HOST, () => {
  console.log(`codex-autoclaw-proxy ok @ http://${BIND_HOST}:${LOCAL_PORT}`);
  console.log(`upstream: ${BASE_URL}`);
});
