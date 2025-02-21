/**
 * @description This action initializes a connection to a TON wallet using the TonConnect SDK. 
 * It handles wallet switching and establishes a new connection 
 * based on the user's request, either with a default wallet or a specified one.
 */

import {
    type ActionExample,
    type Content,
    type HandlerCallback,
    type IAgentRuntime,
    type Memory,
    type State,
    type Action,
    generateObject,
    composeContext,
    ModelClass,
    elizaLogger
} from "@elizaos/core";

import { z } from "zod";

import { TonConnectWalletProvider } from "../providers/tonConnect";

const walletTemplate = `Respond with a JSON markdown block containing only the extracted values.

Example response:
\`\`\`json
{
    "walletName": "<wallet type name from the LAST message>"
}
\`\`\`

Given the last message of the user, extract the name of the desired wallet the user wants to connect to.

{{allWallets}}
There are such wallets out there: ["", "tonkeeper", "tonhub", "wallet"]. The walletName should always be one of these.
The walletName is empty string "", if the user did not specify any particular wallet out of the above names. 
Prefer the empty string if the wallet name is ambiguous. 
Only extract the wallet name based on the LAST user's message.

Respond with a JSON markdown block containing only the extracted values.

Last message:
{{lastMessage}}
`;

const DEFAULT_BRIDGE_URl = 'https://bridge.tonapi.io/bridge';
const DEFAULT_UNIVERSAL_LINK = 'https://app.tonkeeper.com/ton-connect'

interface ActionOptions {
    [key: string]: unknown;
}

export interface WalletInterface extends Content {
    walletName: string;
}

export class InitWalletAction{
    private tonConnectWalletProvider: TonConnectWalletProvider;

    constructor(tonConnectProvider: TonConnectWalletProvider) {
        this.tonConnectWalletProvider = tonConnectProvider;
    }

    async getWalletConnectionDetails(walletName: string): Promise<{ universalLink?: string; bridgeUrl?: string }>{
        await this.tonConnectWalletProvider.setConnector();
        const supportedWallets = await this.tonConnectWalletProvider.getSupportedWallets();
    
        if (walletName === "") {
            return { universalLink: DEFAULT_UNIVERSAL_LINK, bridgeUrl: DEFAULT_BRIDGE_URl };
        }
    
        const wallet = supportedWallets.find(w => w.name.toLowerCase() === walletName.toLowerCase());

        return {
            universalLink: "universalLink" in wallet ? wallet.universalLink : undefined,
            bridgeUrl: "bridgeUrl" in wallet ? wallet.bridgeUrl : undefined
        };
    }     
}

const buildWalletDetails = async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
    all_wallet_names: string[]
): Promise<WalletInterface> => {

    // Define the schema for the expected output
    const walletSchema = z.object({
        walletName: z.string(),
    });

    // Compose wallet context
    const walletContext = composeContext({
        state: state,
        template: walletTemplate.replace('{{lastMessage}}',
            message.content.text
        ).replace('{{allWallets}}', 
            all_wallet_names.toString()
        ),
    });

    // Generate wallet content with the schema
    const content = await generateObject({
        runtime,
        context: walletContext,
        schema: walletSchema,
        modelClass: ModelClass.SMALL,
    });

    let walletContent: WalletInterface = content.object as WalletInterface;

    if (walletContent === undefined) {
        walletContent = content as unknown as WalletInterface;
    }

    return walletContent;
}

export default {
    name: "INIT_TON_CONNECT",
    similes: ["START_TON_CONNECT", "USE_TON_CONNECT", "TON_CONNECT", "CONNECT_TON_WALLET", "SWITCH_TON_CONNECT", "SWITCH_TON_WALLET"],
    description: "Initialize TON Connect to connect to a TON wallet.",

    validate: async (runtime: IAgentRuntime, message: Memory) => {
        elizaLogger.log("Validating TON Connect request from user:", message.userId);
        return true;
    },

    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: ActionOptions,
        callback?: HandlerCallback
    ): Promise<boolean> => {
    elizaLogger.log("Initializing TON Connect...");

    if (!state) {
        state = (await runtime.composeState(message)) as State;
    } else {
        state = await runtime.updateRecentMessageState(state);
    }

    const tonConnectProvider = new TonConnectWalletProvider(runtime, state, callback, message);
    const allWallets = await tonConnectProvider.getSupportedWallets();
    const allWalletNames = allWallets.map(item => item.name)

    // Extract wallet details from user input
    const walletDetails = await buildWalletDetails(runtime, message, state, allWalletNames);

    // Disconnect any existing wallet connection
    await tonConnectProvider.disconnect();

    // Retrieve connection details or use default values
    const { universalLink, bridgeUrl } = walletDetails.walletName
        ? await new InitWalletAction(tonConnectProvider).getWalletConnectionDetails(walletDetails.walletName)
        : { universalLink: DEFAULT_UNIVERSAL_LINK, bridgeUrl: DEFAULT_BRIDGE_URl };

    await tonConnectProvider.connect(universalLink, bridgeUrl);

    elizaLogger.log(`Connected to TON Wallet: ${walletDetails.walletName || "TonKeeper Wallet"}`);

    callback?.({ text: "Successfully connected a TON wallet via TON Connect." });

    return true;
},

examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "I want to use my TON wallet via TON Connect.",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Initializing TON Connect...",
                    action: "INIT_TON_CONNECT",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Connect my TON wallet.",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Connecting your TON wallet...",
                    action: "INIT_TON_CONNECT",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "I need to log in to my wallet.",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Setting up your wallet connection...",
                    action: "INIT_TON_CONNECT",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Can you connect my Tonkeeper wallet?",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Connecting to your Tonkeeper wallet...",
                    action: "INIT_TON_CONNECT",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "I want to switch to Tonhub wallet.",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Switching to Tonhub wallet...",
                    action: "INIT_TON_CONNECT",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "I need to change my wallet. Connect to MyTonWallet.",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Connecting to MyTonWallet...",
                    action: "INIT_TON_CONNECT",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Disconnect my current wallet and connect to Tonkeeper.",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Disconnecting your current wallet and connecting to Tonkeeper...",
                    action: "INIT_TON_CONNECT",
                },
            },
        ],
    ] as ActionExample[][]
} as Action;
