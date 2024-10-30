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

    // 检查会话状态
    const hasSession = sessionTimer.hasActiveSession(uid);
    console.log(`用户 ${uid} 的会话状态: ${hasSession ? '活跃' : '新会话'}`);

    // 人工接管
    if (startsWithIgnoreCase(messageString, '!bot-stop') && message.fromMe) {
        stopMap[uid] = true;
        console.log('人工接管');
        return;
    }

    if (startsWithIgnoreCase(messageString, '!leave') && message.fromMe) {
        delete stopMap[uid];
        console.log('人工离开');
        return;
    }

    // 人工已经介入直接返回
    if (stopMap[uid]) {
        console.log('人工已接入');
        return;
    }

    // 忽略本账号
    if (message.fromMe) return;

    // Prevent handling old messages
    if (message.timestamp != null) {
        const messageTimestamp = new Date(message.timestamp * 1000);

        if (botReadyTimestamp == null) {
            console.log("Ignoring message because bot is not ready yet: " + messageString);
            delete stopMap[uid];
            return;
        }

        if (messageTimestamp < botReadyTimestamp) {
            console.log("Ignoring old message: " + messageString);
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
    await message.reply(htmlToDiscordFormat(answerValue));
}

function htmlToDiscordFormat(htmlString) {
    // 保存<pre>和<code>标签内容
    let specialTags = [];
    htmlString = htmlString.replace(/<(pre|code)>([\s\S]*?)<\/\1>/g, (match, tag, content) => {
        specialTags.push({ tag, content: content.replace(/&lt;/g, '<').replace(/&gt;/g, '>') });
        return `__SPECIAL_TAG_${specialTags.length - 1}__`;
    });

    // 移除所有HTML标签,保留文本内容
    let plainText = htmlString.replace(/<[^>]+>/g, '');

    // 解码HTML实体
    plainText = plainText.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

    // 转换斜体
    plainText = plainText.replace(/(\s|^)<i>(.*?)<\/i>(\s|$)/g, '$1_$2_$3');

    // 转换粗体
    plainText = plainText.replace(/(\s|^)<b>(.*?)<\/b>(\s|$)/g, '$1*$2*$3');
    plainText = plainText.replace(/(\s|^)<strong>(.*?)<\/strong>(\s|$)/g, '$1*$2*$3');

    // 转换删除线
    plainText = plainText.replace(/(\s|^)<s>(.*?)<\/s>(\s|$)/g, '$1~$2~$3');
    plainText = plainText.replace(/(\s|^)<del>(.*?)<\/del>(\s|$)/g, '$1~$2~$3');

    // 转换无序列表
    plainText = plainText.replace(/<ul>([\s\S]*?)<\/ul>/g, (match, p1) => {
        return p1.replace(/<li>(.*?)<\/li>/g, '* $1\n');
    });

    // 转换有序列表
    plainText = plainText.replace(/<ol>([\s\S]*?)<\/ol>/g, (match, p1) => {
        let index = 1;
        return p1.replace(/<li>(.*?)<\/li>/g, () => `${index++}. $1\n`);
    });

    // 转换引用
    plainText = plainText.replace(/<blockquote>([\s\S]*?)<\/blockquote>/g, (match, p1) => {
        return p1.split('\n').map(line => `> ${line}`).join('\n');
    });

    // 恢复<pre>和<code>标签内容
    plainText = plainText.replace(/__SPECIAL_TAG_(\d+)__/g, (match, p1) => {
        const { tag, content } = specialTags[p1];
        if (tag === 'pre') {
            return '```\n' + content + '\n```';
        } else if (tag === 'code') {
            return '`' + content + '`';
        }
    });

    // 删除所有剩余的<code>和</code>标签
    plainText = plainText.replace(/<\/?code>/g, '');

    return plainText.trim();
}

function markdownToDiscordFormat(markdownString) {
    let discordText = markdownString;

    // 转换斜体
    discordText = discordText.replace(/(\s|^)\*([^*\n]+)\*(\s|$)/g, '$1_$2_$3');
    discordText = discordText.replace(/(\s|^)_([^_\n]+)_(\s|$)/g, '$1_$2_$3');

    // 转换粗体
    discordText = discordText.replace(/(\s|^)\*\*([^*\n]+)\*\*(\s|$)/g, '$1*$2*$3');
    discordText = discordText.replace(/(\s|^)__([^_\n]+)__(\s|$)/g, '$1*$2*$3');

    // 转换删除线
    discordText = discordText.replace(/(\s|^)~~([^~\n]+)~~(\s|$)/g, '$1~$2~$3');

    // 转换代码块
    discordText = discordText.replace(/```[\s\S]*?```/g, match => match);

    // 转换无序列表
    discordText = discordText.replace(/^[\*\-\+] (.+)$/gm, '* $1');

    // 转换有序列表
    discordText = discordText.replace(/^\d+\. (.+)$/gm, match => match);

    // 转换引用
    discordText = discordText.replace(/^> (.+)$/gm, match => match);

    // 转换内联代码
    discordText = discordText.replace(/`([^`\n]+)`/g, match => match);

    return discordText.trim();
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
            console.log('reset 执行失败：' + response.statusText)
            timeoutMessage = "ops, 重置会话";
        }
    } catch (error) {
        timeoutMessage = "ops, 重置会话";
        console.log('reset 执行error：' + error.toString())
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
    console.log('prompt 地址 ' + url)
    try {
        const response = await fetch(url, options);
        if (response.ok) {
            const msg = await response.text();
            console.log(msg);
            const parsedResponse = JSON.parse(msg);
            return parsedResponse.answer;
        } else {
            const msg = await response.text();
            console.log('prompt 执行失败' + response.statusText)
            return `Error: ${msg}`;
        }
    } catch (error) {
        console.log('prompt 执行失败：' + error.toString())
        return "出了点状况，请重试";
    }
}

export {handleIncomingMessageV2};
