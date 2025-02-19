import { elizaLogger, settings} from "@elizaos/core";
import {
    type ActionExample,
    type Content,
    type HandlerCallback,
    type IAgentRuntime,
    type Memory,
    ModelClass,
    type State,
    type Action,
    generateObject,
} from "@elizaos/core";
import { composeContext } from "@elizaos/core";
import { generateObjectDeprecated } from "@elizaos/core";
import { TonConnectWalletProvider } from "../providers/tonConnect";
import TonConnect from "@tonconnect/sdk";
import { z } from "zod";

const switchWalletTemplate = `Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined.

Example response:
\`\`\`json
{
    "walletName": "tonhub"
}
\`\`\`

{{recentMessages}}

Given the recent messages, extract the name of the desired wallet the user wants to switch to.

There are such wallets out there: ["tonkeeper", "tonhub", "wallet"]. The walletName should always be one of these.

Respond with a JSON markdown block containing only the extracted values.`;


interface ActionOptions {
    [key: string]: unknown;
}

export interface WalletHandler extends Content {
    walletName: string;
}


export class SwitchWalletAction{
    private tonConnectWalletProvider: TonConnectWalletProvider;
    private readonly runtime: IAgentRuntime;

    constructor(tonConnectProvider: TonConnectWalletProvider) {
        this.tonConnectWalletProvider = tonConnectProvider;
    }

    async switchWallet(universalLink:string, bridgeUrl: string):Promise<TonConnect>{
        await this.tonConnectWalletProvider.disconnect()
        return this.tonConnectWalletProvider.connect(universalLink, bridgeUrl)
    }

    async checkSupportedWallet(walletName: string): Promise<{ universalLink?: string; bridgeUrl?: string } | null> {
        const connector = await this.tonConnectWalletProvider.connect(undefined, undefined);
        const supportedWallets = await this.tonConnectWalletProvider.getSupportedWallets();
        elizaLogger.info(supportedWallets)
        const wallet = supportedWallets.find(w => w.name.toLowerCase() === walletName.toLowerCase());
    
        if (!wallet) return null; // If no wallet is found, return null
    
        return {
            universalLink: wallet.universalLink ?? undefined,  // Handle optional property
            bridgeUrl: wallet.bridgeUrl ?? undefined           // Handle optional property
        };
    }
}

const buildSwitchWalletDetails= async (
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
            template: switchWalletTemplate,
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
    name: "SWITCH_WALLET",
    similes: ["CHANGE_WALLET", "CHANGE_TON_WALLET", "SWITCH_TON_WALLET"],
    description:
        "Call this action to change the current TonConnect Wallet.",
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: ActionOptions,
        callback?: HandlerCallback,
    ) => {
        elizaLogger.log("Starting switching wallet.");
        
                const walletDetails = await buildSwitchWalletDetails(
                    runtime,
                    message,
                    state,
                );

                const tonConnectProvider = new TonConnectWalletProvider(
                    runtime,
                    state,
                    callback,
                    message
                );
                callback({text: walletDetails.walletName})
                elizaLogger.info(`KAKA: ${walletDetails}`)
                const action = new SwitchWalletAction(tonConnectProvider);
                callback({text: walletDetails.walletName})
                const { universalLink, bridgeUrl } = await action.checkSupportedWallet(walletDetails.walletName) || {};
                if (universalLink == undefined || bridgeUrl == undefined)
                    throw new Error(`Switching failed: desired wallet is not supported`);
                await action.switchWallet(universalLink, bridgeUrl)
                callback({text: "nice, wallet has been switched"})
    },
    validate: async (_runtime: IAgentRuntime) => {
        //console.log("Validating TON transfer from user:", message.userId);
        return true;
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Switch my wallet in TonConnect",
                    action: "SWITCH_WALLET",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Okay! Write me the name of the wallet you want to switch on",
                    action: "SWITCH_WALLET",
                },
            },
            {
                user: "{{user1}}",
                content: {
                    text: "I want to switch to Tonkeeper",
                    action: "SWITCH_WALLET",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Successfully switched to the Tonkeeper",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "I want to use another wallet in TonConnect",
                    action: "SWITCH_WALLET",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Select desired wallet from the list",
                    action: "SWITCH_WALLET",
                },
            },
            {
                user: "{{user1}}",
                content: {
                    text: "I want to use Tonhub",
                    action: "SWITCH_WALLET",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "You are switched to Tonhub! Congratulations!",
                },
            },
        ],
    ] as ActionExample[][],
};
