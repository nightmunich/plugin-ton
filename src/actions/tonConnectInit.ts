import { elizaLogger, settings } from "@elizaos/core";
import {
    type ActionExample,
    type Content,
    type HandlerCallback,
    type IAgentRuntime,
    type Memory,
    ModelClass,
    type State,
    type Action,
    generateObject
} from "@elizaos/core";
import { composeContext } from "@elizaos/core";
import { generateObjectDeprecated } from "@elizaos/core";
import { TonConnectWalletProvider } from "../providers/tonConnect";
import { z } from "zod";
import TonConnect from "@tonconnect/sdk";

// const tonConnectInitTemplate = `Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined.

// Example response:
// \`\`\`json
// {
//     "recipient": "9jW8FPr6BSSsemWPV22UUCzSqkVdTp6HTyPqeqyuBbCa",
//     "amount": 1.5
// }
// \`\`\`

// {{recentMessages}}

// Extract the following information about the requested SOL transfer:
// - Recipient wallet address
// - Amount of SOL to transfer
// `;

// {{recentMessages}}

// Given the recent messages, extract the name of the desired wallet the user wants to connect to.

const initWalletTemplate = `Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined.

Example response:
\`\`\`json
{
    "walletName": string
}
\`\`\`

{{recentMessages}}

Given the last message, extract the name of the desired wallet the user wants to connect to.

There are such wallets out there: ["tonkeeper", "tonhub", "wallet", ""]. The walletName should always be one of these.
The walletName is empty string "", if the user did not specify any particular wallet out of the above names. 

Respond with a JSON markdown block containing only the extracted values.`;

interface ActionOptions {
    [key: string]: unknown;
}

export interface WalletHandler extends Content {
    walletName: string;
}

export class InitWalletAction{
    private tonConnectWalletProvider: TonConnectWalletProvider;
    private readonly runtime: IAgentRuntime;

    constructor(tonConnectProvider: TonConnectWalletProvider) {
        this.tonConnectWalletProvider = tonConnectProvider;
    }

    async checkSupportedWallet(walletName: string): Promise<{ universalLink?: string; bridgeUrl?: string } | null> {
        const connector = await this.tonConnectWalletProvider.connect(undefined, undefined);
        const supportedWallets = await this.tonConnectWalletProvider.getSupportedWallets();
        elizaLogger.info(supportedWallets)

        // if (walletName === "") return {universalLink: undefined, bridgeUrl: undefined};

        const wallet = supportedWallets.find(w => w.name.toLowerCase() === walletName.toLowerCase());
    
        if (!wallet) return null; // If no wallet is found, return null
    
        if ("universalLink" in wallet && "bridgeUrl" in wallet) {
            return {
                universalLink: wallet.universalLink ?? undefined,  // Handle optional property
                bridgeUrl: wallet.bridgeUrl ?? undefined           // Handle optional property
            };    
        }
        return {
            universalLink: undefined,
            bridgeUrl: undefined
        }
    }
}

const buildWalletDetails= async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
): Promise<WalletHandler> => {
    let currentState = state;
    if (!currentState) {
        currentState = (await runtime.composeState(message)) as State;
    } else {
        currentState = await runtime.updateRecentMessageState(currentState);
    }

    const walletSchema = z.object({
        walletName: z.string(),
    });

    const walletContext = composeContext({
        state,
        template: initWalletTemplate,
    });

    // Generate transfer content with the schema
    const content = await generateObject({
        runtime,
        context: walletContext,
        schema: walletSchema,
        modelClass: ModelClass.SMALL,
    });

    let walletContent: WalletHandler = content.object as WalletHandler;

    if (walletContent === undefined) {
        walletContent = content as unknown as WalletHandler;
    }

    return walletContent;
}


export default {
    name: "INIT_TON_CONNECT",
    similes: ["START_TON_CONNECT", "USE_TON_CONNECT", "TON_CONNECT", "CONNECT_TON_WALLET"],
    description: "Initialize TON Connect to connect to a TON wallet.",
    validate: async (runtime: IAgentRuntime, message: Memory) => {
        // Always return true for token transfers, letting the handler deal with specifics
        elizaLogger.log("Validating token transfer from user:", message.userId);
        return true;
    },
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback?: HandlerCallback
    ): Promise<boolean> => {
        elizaLogger.log("Starting INIT_TON_CONNECT handler...");

        if (!state) {
            state = (await runtime.composeState(message)) as State;
        } else {
            state = await runtime.updateRecentMessageState(state);
        }

        const walletDetails = await buildWalletDetails(
            runtime,
            message,
            state,
        );
        const tonConnectProvider = new TonConnectWalletProvider(
            runtime,
            state,
            callback,
            message,
        );
        let connector;
        
        if(walletDetails.walletName === undefined){
            connector = await tonConnectProvider.connect(undefined, undefined);
            elizaLogger.info("FRF");
        }
        else{
            const action = new InitWalletAction(tonConnectProvider);
            const { universalLink, bridgeUrl } = await action.checkSupportedWallet(walletDetails.walletName) || {};
            connector = await tonConnectProvider.connect(universalLink, bridgeUrl);
            elizaLogger.info(walletDetails.walletName)
        }

        elizaLogger.log("Connected to a TON Wallet via TON Connect.")
        if (callback) {
            callback({
                text: "Successfully connected a TON wallet via TON Connect."
            })
        }

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
    ] as ActionExample[][],
} as Action;