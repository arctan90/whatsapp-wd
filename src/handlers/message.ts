import {Message} from "whatsapp-web.js";
import {startsWithIgnoreCase} from "../utils";

// Config & Constants
import config from "../config";

// CLI
import * as cli from "../cli/ui";

// ChatGPT & DALLE
import {handleDeleteConversation} from "../handlers/gpt";

// Speech API & Whisper
// For deciding to ignore old messages
import {botReadyTimestamp} from "../index";

const stopMap = []

// Handles message
async function handleIncomingMessageV2(message: Message) {

    let messageString = message.body;

    // 人工接管
    if (startsWithIgnoreCase(messageString, '!bot-stop') && message.fromMe) {
        // todo 人工介入后会话清除
        await handleDeleteConversation(message);
        stopMap[message.from] = true;
        cli.print('人工接管')
        return
    }

    if (startsWithIgnoreCase(messageString, '!leave') && message.fromMe) {
        // todo 人工服务离开
        delete stopMap[message.from];
        cli.print('人工离开')
        return
    }

    // 人工已经介入直接返回
    if (stopMap[message.from]) {
        cli.print('人工已接入')
        return
    }

    // 忽略本账号 todo 按配置来
    // if (message.fromMe) return;

    // Prevent handling old messages
    if (message.timestamp != null) {
        const messageTimestamp = new Date(message.timestamp * 1000);

        // If startTimestamp is null, the bot is not ready yet
        if (botReadyTimestamp == null) {
            cli.print("Ignoring message because bot is not ready yet: " + messageString);
            delete stopMap[message.from];
            return;
        }

        // Ignore messages that are sent before the bot is started
        if (messageTimestamp < botReadyTimestamp) {
            cli.print("Ignoring old message: " + messageString);
            delete stopMap[message.from];
            return;
        }
    }

    // Ignore groupchats if disabled 如果是群聊，同时配置中不允许群聊bot，则返回
    if ((await message.getChat()).isGroup && !config.groupchatsEnabled) return;

    const answerValue = await  botRequest(messageString, message.from)
    // fixme 引入3分钟未应答断开机制（调用针对uid的/reset消息，其中uid=message.from）
    await message.reply(answerValue)
    return;
}

export {handleIncomingMessageV2};


// 这里是调用GPT的入口
async function botRequest(text: string, uid: string) {
    const url = config.botServerUrl + "/prompt";

    // Request options
    const options = {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "pd-version": config.pv_version,
        },
        body: JSON.stringify({
            'prompt': text,
            'uid': uid,
            // 'source': config.biz_source,
        })
    };

    try {
        const response = await fetch(url, options);
        if (response.ok) {
            // 解析 JSON 响应体
            const msg =  await response.text();
            cli.print(msg)
            const parsedResponse = JSON.parse(msg);
            return parsedResponse.answer
        } else {
            // 处理非 2xx 响应
            return `Error: ${response.status}`;
        }

    } catch (error) {
        return "ops";
    }
}