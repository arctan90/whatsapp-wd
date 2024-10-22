import {Message} from "whatsapp-web.js";
import {startsWithIgnoreCase} from "../utils";
import sessionTimer from './sessionTimer';

// Config & Constants
import config from "../config";

// CLI
import * as cli from "../cli/ui";


// Speech API & Whisper
// For deciding to ignore old messages
import {botReadyTimestamp} from "../index";

const stopMap: Record<string, boolean> = {};


// 处理消息
async function handleIncomingMessageV2(message: Message) {
    const messageString = message.body;
    const uid = message.from;

    // 人工接管
    if (startsWithIgnoreCase(messageString, '!bot-stop') && message.fromMe) {
        stopMap[uid] = true;
        cli.print('人工接管');
        return;
    }

    if (startsWithIgnoreCase(messageString, '!leave') && message.fromMe) {
        delete stopMap[uid];
        cli.print('人工离开');
        return;
    }

    // 人工已经介入直接返回
    if (stopMap[uid]) {
        cli.print('人工已接入');
        return;
    }

    // 忽略本账号
    if (message.fromMe) return;

    // Prevent handling old messages
    if (message.timestamp != null) {
        const messageTimestamp = new Date(message.timestamp * 1000);

        if (botReadyTimestamp == null) {
            cli.print("Ignoring message because bot is not ready yet: " + messageString);
            delete stopMap[uid];
            return;
        }

        if (messageTimestamp < botReadyTimestamp) {
            cli.print("Ignoring old message: " + messageString);
            delete stopMap[uid];
            return;
        }
    }

    // Ignore groupchats if disabled
    if ((await message.getChat()).isGroup && !config.groupchatsEnabled) return;

    // 更新会话定时器
    sessionTimer.updateSession(uid, async () => {
        await sendTimeoutMessage(message);
    });

    const answerValue = await botRequest(messageString, uid);
    await message.reply(answerValue);
}

async function sendTimeoutMessage(message: Message) {
    let timeoutMessage = "由于会话3分钟内未收到新消息，该会话已重置";
    // fixme 发/reset 消息

    const url = config.botServerUrl + "/reset";

    const options = {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "pd-version": config.pv_version,
        },
        body: JSON.stringify({
            'uid': message.from,
            // 'source': config.biz_source,
        })
    };

    try {
        const response = await fetch(url, options);
        if (!response.ok) {
            timeoutMessage = "ops, 重置会话";
        }
    } catch (error) {
        timeoutMessage =  "ops, 重置会话";
    }

    await message.reply(timeoutMessage);
}

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
            const msg = await response.text();
            cli.print(msg);
            const parsedResponse = JSON.parse(msg);
            return parsedResponse.answer;
        } else {
            const msg = await response.text();
            return `Error: ${msg}`;
        }
    } catch (error) {
        return "出了点状况，请重试";
    }
}

export {handleIncomingMessageV2};
