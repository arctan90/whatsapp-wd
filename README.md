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

run `pm2 start npm --name chat-bot --watch --namespace chat-bot-namespace -- run start`

restart `pm2 restart -name chat-bot --watch --namespace chat-bot-namespace`