# WhatsApp agent

## Requirements

-   Node.js (18 or newer)
-   A recent version of npm
-   An [OpenAI API key](https://beta.openai.com/signup)
-   A WhatsApp account

## Documentation
Forked from askrella/whatsapp-chatgpt
https://askrella.github.io/whatsapp-chatgpt<

## Contributors

<a href="https://github.com/askrella/whatsapp-chatgpt/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=askrella/whatsapp-chatgpt" />
</a>

## Used libraries

-   https://github.com/transitive-bullshit/chatgpt-api
-   https://github.com/pedroslopez/whatsapp-web.js
-   https://github.com/askrella/speech-rest-api

## Run using pm2
run `pm2 start npm --name chat-bot --watch --namespace chat-bot-namespace -- run start`

restart `pm2 restart -name chat-bot --watch --namespace chat-bot-namespace`