import {Message} from "whatsapp-web.js";
import {startsWithIgnoreCase} from "../utils";

// Config & Constants
import config from "../config";

// CLI
import * as cli from "../cli/ui";

// ChatGPT & DALLE
import {handleDeleteConversation, handleMessageGPT} from "../handlers/gpt";

// Speech API & Whisper

// For deciding to ignore old messages
import {botReadyTimestamp} from "../index";

const stopMap = []

// Handles message
async function handleIncomingMessage(message: Message) {
    let messageString = message.body;

    // 忽略本账号
    if (message.fromMe) return;

    // 人工接管
    if (startsWithIgnoreCase(messageString, '!bot-stop')) {
        // todo 人工介入后回话清除
        await handleDeleteConversation(message);
        stopMap[message.from] = true;
        return
    }

    if (startsWithIgnoreCase(messageString, '!leave')) {
        // todo 人工服务离开
        delete stopMap[message.from];
        return
    }

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

    // 人工已经介入直接返回
    if (stopMap[message.from]) {
        return
    }

    // Ignore groupchats if disabled 如果是群聊，同时配置中不允许群聊bot，则返回
    if ((await message.getChat()).isGroup && !config.groupchatsEnabled) return;

    // 如果是我自己 且 无引用的消息 且自己发给自己的，标记成selfNotedMessage
    const selfNotedMessage = message.fromMe && message.hasQuotedMsg === false && message.from === message.to;

    // if (config.whitelistedEnabled) {
    // 	// 白名单是手机号
    // 	const whitelistedPhoneNumbers = getConfig("general", "whitelist");
    //
    // 	// 如果不是自己，且发信人不在白名单里，则不给他bot回复。即，bot仅回复白名单中的
    // 	if (!selfNotedMessage && whitelistedPhoneNumbers.length > 0 && !whitelistedPhoneNumbers.includes(message.from)) {
    // 		cli.print(`Ignoring message from ${message.from} because it is not whitelisted.`);
    // 		return;
    // 	}
    // }
    // Transcribe audio 不处理语音
    // if (message.hasMedia) {
    // 	const media = await message.downloadMedia();
    //
    // 	// Ignore non-audio media
    // 	if (!media || !media.mimetype.startsWith("audio/")) return;
    //
    // 	// Check if transcription is enabled (Default: false)
    // 	if (!getConfig("transcription", "enabled")) {
    // 		cli.print("[Transcription] Received voice messsage but voice transcription is disabled.");
    // 		return;
    // 	}
    //
    // 	// Convert media to base64 string
    // 	const mediaBuffer = Buffer.from(media.data, "base64");
    //
    // 	// Transcribe locally or with Speech API
    // 	const transcriptionMode = getConfig("transcription", "mode");
    // 	cli.print(`[Transcription] Transcribing audio with "${transcriptionMode}" mode...`);
    //
    // 	let res;
    // 	switch (transcriptionMode) {
    // 		case TranscriptionMode.Local:
    // 			res = await transcribeAudioLocal(mediaBuffer);
    // 			break;
    // 		case TranscriptionMode.OpenAI:
    // 			res = await transcribeOpenAI(mediaBuffer);
    // 			break;
    // 		case TranscriptionMode.WhisperAPI:
    // 			res = await transcribeWhisperApi(new Blob([mediaBuffer]));
    // 			break;
    // 		case TranscriptionMode.SpeechAPI:
    // 			res = await transcribeRequest(new Blob([mediaBuffer]));
    // 			break;
    // 		default:
    // 			cli.print(`[Transcription] Unsupported transcription mode: ${transcriptionMode}`);
    // 	}
    // 	const { text: transcribedText, language: transcribedLanguage } = res;
    //
    // 	// Check transcription is null (error)
    // 	if (transcribedText == null) {
    // 		message.reply("I couldn't understand what you said.");
    // 		return;
    // 	}
    //
    // 	// Check transcription is empty (silent voice message)
    // 	if (transcribedText.length == 0) {
    // 		message.reply("I couldn't understand what you said.");
    // 		return;
    // 	}
    //
    // 	// Log transcription
    // 	cli.print(`[Transcription] Transcription response: ${transcribedText} (language: ${transcribedLanguage})`);
    //
    // 	// Reply with transcription
    // 	if (config.ttsTranscriptionResponse) {
    // 		const reply = `You said: ${transcribedText}${transcribedLanguage ? " (language: " + transcribedLanguage + ")" : ""}`;
    // 		message.reply(reply);
    // 	}
    //
    // 	// Handle message GPT
    // 	await handleMessageGPT(message, transcribedText);
    // 	return;
    // }

    // Clear conversation context (!clear)
    if (startsWithIgnoreCase(messageString, config.resetPrefix)) {
        // todo 上下文怎么维护的？ 存在本地的一个内存Map里，Map的key是message.from
        await handleDeleteConversation(message);
        return;
    }

    // AiConfig (!config <args>) 帮助文档，注释掉
    // if (startsWithIgnoreCase(messageString, config.aiConfigPrefix)) {
    // 	const prompt = messageString.substring(config.aiConfigPrefix.length + 1);
    // 	await handleMessageAIConfig(message, prompt);
    // 	return;
    // }

    // GPT (!gpt <prompt>)
    // if (startsWithIgnoreCase(messageString, config.gptPrefix)) {
    // 	const prompt = messageString.substring(config.gptPrefix.length + 1);
    // 	await handleMessageGPT(message, prompt);
    // 	return;
    // }

    // GPT (!lang <prompt>)
    // if (startsWithIgnoreCase(messageString, config.langChainPrefix)) {
    // 	const prompt = messageString.substring(config.langChainPrefix.length + 1);
    // 	await handleMessageLangChain(message, prompt);
    // 	return;
    // }

    // DALLE (!dalle <prompt>)
    // if (startsWithIgnoreCase(messageString, config.dallePrefix)) {
    // 	const prompt = messageString.substring(config.dallePrefix.length + 1);
    // 	await handleMessageDALLE(message, prompt);
    // 	return;
    // }

    // Stable Diffusion (!sd <prompt>)
    // if (startsWithIgnoreCase(messageString, config.stableDiffusionPrefix)) {
    // 	const prompt = messageString.substring(config.stableDiffusionPrefix.length + 1);
    // 	await executeCommand("sd", "generate", message, prompt);
    // 	return;
    // }

    // GPT (only <prompt>)
    // if (!config.prefixEnabled || (config.prefixSkippedForMe && selfNotedMessage)) {
    await handleMessageGPT(message, messageString);
    return;
    // }
}

async function handleIncomingMessageV2(message: Message) {
    let messageString = message.body;

    // 人工接管
    if (startsWithIgnoreCase(messageString, '!bot-stop') && message.fromMe) {
        // todo 人工介入后会话清除
        await handleDeleteConversation(message);
        stopMap[message.from] = true;
        return
    }

    if (startsWithIgnoreCase(messageString, '!leave') && message.fromMe) {
        // todo 人工服务离开
        delete stopMap[message.from];
        return
    }

    // 人工已经介入直接返回
    if (stopMap[message.from]) {
        return
    }

    // 忽略本账号
    if (message.fromMe) return;

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

    const response = await  botRequest(messageString, message.from)
    await message.reply(response)
    return;
}

export {handleIncomingMessageV2};


async function botRequest(text: string, uid: string) {
    const url = config.botServerUrl + "/chat/bluehost";

    // Request options
    const options = {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "pd-version": config.pv_version,
        },
        body: JSON.stringify({
            'message': text,
            'uid': uid,
        })
    };

    try {
        const response = await fetch(url, options);
        if (response.ok) {
            // 解析 JSON 响应体
            return await response.text();
        } else {
            // 处理非 2xx 响应
            return `Error: ${response.status}`;
        }

    } catch (error) {
        return "ops";
    }
}