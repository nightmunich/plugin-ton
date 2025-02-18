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
    // amount: string | number;
    // bridgeUrl: string;
}

// function isWalletHandler(content: Content): content is WalletHandler {
//     elizaLogger.log("Content for transfer", content);

//     return (
//         typeof content.wallet_name === "string" 
//     );
// }

export class SwitchWalletAction{
    private tonConnectWalletProvider: TonConnectWalletProvider;
    private readonly runtime: IAgentRuntime;

    constructor(tonConnectProvider: TonConnectWalletProvider) {
        this.tonConnectWalletProvider = tonConnectProvider;
    }

    async switchWallet(universalLink:string, bridgeUrl: string):Promise<TonConnect>{
        // if (!this.tonConnectWalletProvider.isConnected){
        //     this.tonConnectWalletProvider.disconnect()
        //     return this.tonConnectWalletProvider.connect(universalLink, bridgeUrl)
        // }
        // if(!this.tonConnectWalletProvider.disconnect())
        //     throw new Error(`Error disconnecting`);
        // this.tonConnectWalletProvider = new TonConnectWalletProvider(this.runtime)
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


// const buildTransferDetails = async (
//     runtime: IAgentRuntime,
//     message: Memory,
//     state: State,
// ): Promise<TransferContent> => {
//     // const walletInfo = await nativeWalletProvider.get(runtime, message, state);
//     // state.walletInfo = walletInfo;

//     // Initialize or update state
//     let currentState = state;
//     if (!currentState) {
//         currentState = (await runtime.composeState(message)) as State;
//     } else {
//         currentState = await runtime.updateRecentMessageState(currentState);
//     }

//     // Define the schema for the expected output
//     const transferSchema = z.object({
//         recipient: z.string(),
//         amount: z.union([z.string(), z.number()]),
//     });

//     // Compose transfer context
//     const transferContext = composeContext({
//         state,
//         template: transferTemplate,
//     });

//     // Generate transfer content with the schema
//     const content = await generateObject({
//         runtime,
//         context: transferContext,
//         schema: transferSchema,
//         modelClass: ModelClass.SMALL,
//     });

//     let transferContent: TransferContent = content.object as TransferContent;

//     if (transferContent === undefined) {
//         transferContent = content as unknown as TransferContent;
//     }

//     return transferContent;
// };

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
                // if(!action.checkSupportedWallet(walletDetails.walletName))
                //     throw new Error(`Switching failed: desired wallet is not supported`);

                // // Validate transfer content
                // if (!isWalletHandler(walletDetails)) {
                //     elizaLogger.error("Invalid content for SwitchTonConnectWallet action.");
                //     if (callback) {
                //         callback({
                //             text: "Unable to process Wallet switching",
                //             content: { error: "Invalid wallet info content" },
                //         });
                //     }
                //     return false;
                // }
        
                // try {
                //     // TODO check token balance before transfer
                //     // const walletProvider = await initWalletProvider(runtime);
                //     const tonConnectProvider = new TonConnectWalletProvider(
                //         runtime,
                //         state,
                //         callback,
                //         runtime.getSetting("TON_CONNECT_MANIFEST_URL") ?? null,
                //     );
                //     // const provider = tonConnectProvider.connect();
        
                //     const action = new TransferAction(tonConnectProvider);
                //     const hash = await action.transfer(transferDetails);
        
                //     if (callback) {
                //         callback({
                //             // TODO wait for transaction to complete
                //             text: `Successfully transferred ${transferDetails.amount} TON to ${transferDetails.recipient}, Transaction: ${hash}`,
                //             content: {
                //                 success: true,
                //                 hash: hash,
                //                 amount: transferDetails.amount,
                //                 recipient: transferDetails.recipient,
                //             },
                //         });
                //     }
        
                //     return true;
                // } catch (error) {
                //     elizaLogger.error("Error during token transfer:", error);
                //     if (callback) {
                //         callback({
                //             text: `Error transferring tokens: ${error.message}`,
                //             content: { error: error.message },
                //         });
                //     }
                //     return false;
                // }
    },
    // template: transferTemplate,
    // eslint-disable-next-line
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
        // [
        //     {
        //         user: "{{user1}}",
        //         content: {
        //             text: "Please move 2.5 TON to EQByzSQE5Mf_UBf5YYVF_fRhP_oZwM_h7mGAymWBjxkY5yVm",
        //             action: "SEND_TON_TOKEN",
        //         },
        //     },
        //     {
        //         user: "{{user2}}",
        //         content: {
        //             text: "Initiating transfer of 2.5 TON...",
        //             action: "SEND_TON_TOKEN",
        //         },
        //     },
        //     {
        //         user: "{{user2}}",
        //         content: {
        //             text: "Successfully sent 2.5 TON to EQByzSQE5Mf_UBf5YYVF_fRhP_oZwM_h7mGAymWBjxkY5yVm, Transaction: c8ee4a2c1bd070005e6cd31b32270aa461c69b927c3f4c28b293c80786f78b43",
        //         },
        //     },
        // ],
    ],
};
