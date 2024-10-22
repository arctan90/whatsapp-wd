# WhatsApp agent
Forked from https://github.com/askrella/whatsapp-chatgpt

## Requirements

-   Node.js (18 or newer)
-   A recent version of npm
-   An [OpenAI API key](https://beta.openai.com/signup)
-   A WhatsApp account

## Used libraries

-   https://github.com/transitive-bullshit/chatgpt-api
-   https://github.com/pedroslopez/whatsapp-web.js
-   https://github.com/askrella/speech-rest-api

## Run using pm2
install package `npm install`

run `pm2 start npm --name chat-bot --namespace chat-bot-namespace --no-autorestart -- run start`
restart `pm2 restart npm --name chat-bot --namespace chat-bot-namespace --no-autorestart -- run start`

## 新增功能：会话超时管理

为了提高系统的效率和用户体验，我们新增了会话超时管理功能。这个功能可以自动关闭长时间不活跃的会话，并在需要时重置会话状态。

### 主要特性：

1. **自动超时**: 如果用户在指定时间内（当前设置为20秒）没有发送新消息，系统会自动关闭该会话。

2. **超时提醒**: 当会话超时时，系统会向用户发送一条提醒消息。

3. **会话重置**: 超时后，系统会自动调用后端的 `/reset` 接口，重置该用户的会话状态。

4. **定时器管理**: 每个用户都有独立的定时器，新消息会重置定时器。

5. **优雅退出**: 在应用关闭时，所有定时器会被正确清理，防止资源泄露。

### 工作流程：

1. 当收到用户消息时，系统会为该用户创建或重置一个3分钟的定时器。
2. 如果在20秒内再次收到该用户的消息，定时器会被重置。
3. 如果20秒内没有收到新消息，系统会：
   - 向用户发送一条超时提醒消息
   - 调用后端的 `/reset` 接口重置会话
   - 清除该用户的定时器

### 注意事项：

- 超时时间当前设置为20秒，主要用于测试目的。在实际生产环境中，建议将此值设置为更长的时间（如3-5分钟）。
- 所有定时器操作都有日志输出，方便调试和监控。

这个新功能提高了系统的自动化程度，有助于管理长时间不活跃的会话，并确保系统资源得到有效利用。
