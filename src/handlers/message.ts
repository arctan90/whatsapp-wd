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
    await message.reply(markdownToClient(answerValue));
}

function markdownToClient(markdown) {
    // Italics: text -> <i>text</i>
    markdown = markdown.replace(/([^]+)_/g, '<i>$1</i>');

    // Bold: text -> <b>text</b>
    // markdown = markdown.replace(/\([^\]+)\*/g, '<b>$1</b>');
    markdown = markdown.replace(/\\([^]+)\\*/g, '<b>$1</b>');

    // Strikethrough: text -> <s>text</s>
    markdown = markdown.replace(/([^]+)~/g, '<s>$1</s>');

    // Monospace: text -> <code>text</code>
    markdown = markdown.replace(/([^`]+)/g, '<code>$1</code>');

    // Bulleted list: * text or - text -> <ul><li>text</li></ul>
    markdown = markdown.replace(/(\*|\-)\s+(.+)/g, '<li>$2</li>');
    markdown = markdown.replace(/(<li>.+<\/li>)/g, '<ul>$1</ul>');

    // Numbered list: 1. text -> <ol><li>text</li></ol>
    markdown = markdown.replace(/\d+\.\s+(.+)/g, '<li>$1</li>');
    markdown = markdown.replace(/(<li>.+<\/li>)/g, '<ol>$1</ol>');

    // Quote: > text -> <blockquote>text</blockquote>
    markdown = markdown.replace(/>\s+(.+)/g, '<blockquote>$1</blockquote>');

    // Inline code: text -> <code>text</code>
    markdown = markdown.replace(/([^]+)`/g, '<code>$1</code>');

    return markdown;
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
            cli.print('reset 执行失败：' + response.statusText)
            timeoutMessage = "ops, 重置会话";
        }
    } catch (error) {
        timeoutMessage = "ops, 重置会话";
        cli.print('reset 执行error：' + error.toString())
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
    cli.print('prompt 地址 ' + url)
    try {
        const response = await fetch(url, options);
        if (response.ok) {
            const msg = await response.text();
            cli.print(msg);
            const parsedResponse = JSON.parse(msg);
            return parsedResponse.answer;
        } else {
            const msg = await response.text();
            cli.print('prompt 执行失败' + response.statusText)
            return `Error: ${msg}`;
        }
    } catch (error) {
        cli.print('prompt 执行失败：' + error.toString())
        return "出了点状况，请重试";
    }
}

export {handleIncomingMessageV2};
