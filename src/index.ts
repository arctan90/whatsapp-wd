import qrcode from "qrcode";
import {Client, Message, Events, LocalAuth} from "whatsapp-web.js";

// Constants
import constants from "./constants";

// CLI
import * as cli from "./cli/ui";
import {handleIncomingMessage, handleIncomingMessageV2} from "./handlers/message";

// Config
import {initAiConfig} from "./handlers/ai-config";
import {initOpenAI} from "./providers/openai";

// Ready timestamp of the bot
let botReadyTimestamp: Date | null = null;

// Entrypoint
const start = async () => {
    const wwebVersion = "2.2412.54";
    cli.printIntro();

    // WhatsApp Client 引入一个三方的whatsapp的sdk
    const client = new Client({
        puppeteer: {
            args: ["--no-sandbox"]
        },
        authStrategy: new LocalAuth({
            dataPath: constants.sessionPath
        }),
        webVersionCache: {
            type: "remote",
            remotePath: `https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/${wwebVersion}.html`
        }
    });

    // WhatsApp auth
    client.on(Events.QR_RECEIVED, (qr: string) => {
        qrcode.toString(
            qr,
            {
                type: "terminal",
                small: true,
                margin: 2,
                scale: 1
            },
            (err, url) => {
                if (err) throw err;
                cli.printQRCode(url);
            }
        );
    });

    // WhatsApp loading
    client.on(Events.LOADING_SCREEN, (percent) => {
        if (percent == "0") {
            cli.printLoading();
        }
    });

    // WhatsApp authenticated
    client.on(Events.AUTHENTICATED, () => {
        cli.printAuthenticated();
    });

    // WhatsApp authentication failure
    client.on(Events.AUTHENTICATION_FAILURE, () => {
        cli.printAuthenticationFailure();
    });

    // WhatsApp ready
    client.on(Events.READY, () => {
        // Print outro
        cli.printOutro();

        // Set bot ready timestamp
        botReadyTimestamp = new Date();

        // 初始化加载处理模块，调各个模块的register方法来配置初始化参数
        initAiConfig();
        // 初始化两个全局对象，chatGPT和openai，这两个都是官方的sdk
        // initOpenAI();
    });

    // WhatsApp message
    client.on(Events.MESSAGE_RECEIVED, async (message: any) => {
        cli.print("MESSAGE_RECEIVED: " + message.body);
        // Ignore if message is from status broadcast
        if (message.from == constants.statusBroadcast) return;

        // fixed 对方引用的时候无回复
        // // Ignore if it's a quoted message, (e.g. Bot reply)
        // if (message.hasQuotedMsg) return;

        await handleIncomingMessageV2(message);
    });

    // Reply to own message，自己创建消息的时候处理入口
    client.on(Events.MESSAGE_CREATE, async (message: Message) => {
        cli.print("MESSAGE_CREATE: " + message.body);

        // Ignore if message is from status broadcast
        if (message.from == constants.statusBroadcast) return;

        // Ignore if it's a quoted message, (e.g. Bot reply)
        if (message.hasQuotedMsg) return;
        //
        // Ignore if it's not from me
        if (!message.fromMe) return;

        await handleIncomingMessageV2(message);
    });

    // WhatsApp initialization
    client.initialize();
};

start();

export {botReadyTimestamp};
