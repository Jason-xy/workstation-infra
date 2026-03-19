# codex-proxy

本目录提供一个本地 OpenAI Chat Completions 到 Codex Responses API 的转发代理。
镜像内已安装 Codex CLI（`@openai/codex`）。

## 目标

- 本地统一入口: `http://127.0.0.1:18801/v1`
- 上游 Codex 地址: 由 `.env` 中 `BASE_URL` 指定
- 上游 API Key: 由 `.env` 中 `API_KEY` 指定

## 环境变量

在当前目录创建 `.env`，至少包含:

```env
CODEX_API_BASE=https://chat.nuoda.vip/codex
CODEX_API_KEY=sk-xxxxxx
BASE_URL=https://chat.nuoda.vip/codex/v1/responses
API_KEY=sk-xxxxxx
LOCAL_PORT=18801
MODELS=gpt-5-codex,gpt-5,gpt-5.4,gpt-5.1,gpt-5.2
```

说明:

- `CODEX_API_BASE`: Codex CLI 使用的 base URL。
- `CODEX_API_KEY`: Codex CLI 使用的 API Key。
- `BASE_URL`: 上游 Codex Responses API 完整地址。
- `API_KEY`: 默认上游密钥。若客户端请求自带 `Authorization`，优先转发客户端值。
- `LOCAL_PORT`: 本地代理监听端口。
- `MODELS`: `/v1/models` 返回的模型列表（逗号分隔）。

## Docker 启动

```bash
cd cloud-services/codex-proxy
docker compose up -d --build
```

在容器内调用 Codex CLI:

```bash
docker compose exec codex-autoclaw-proxy codex
```

## 使用方式

将客户端（如 AutoClaw/OpenAI 兼容客户端）指向:

- Base URL: `http://127.0.0.1:18801/v1`
- API 协议: OpenAI

可用检查:

```bash
curl http://127.0.0.1:18801/v1/models
```
