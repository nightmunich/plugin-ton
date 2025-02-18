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
} from "@elizaos/core";
import { composeContext } from "@elizaos/core";
import { generateObjectDeprecated } from "@elizaos/core";
import { TonConnectWalletProvider } from "../providers/tonConnect";
import TonConnect from "@tonconnect/sdk";


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
        return this.tonConnectWalletProvider.connect(universalLink, bridgeUrl)
    }
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
        callback?: HandlerCallback,
    ) => {
        
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
                    // action: "SEND_TON_TOKEN",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Okay! Write me the name of the wallet you want to switch on",
                    // action: "SEND_TON_TOKEN",
                },
            },
            {
                user: "{{user1}}",
                content: {
                    text: "I want to switch to Tonkeeper",
                    // action: "SEND_TON_TOKEN",
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
                    // action: "SEND_TON_TOKEN",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Select desired wallet from the list",
                    // action: "SEND_TON_TOKEN",
                },
            },
            {
                user: "{{user1}}",
                content: {
                    text: "I want to use Tonhub",
                    // action: "SEND_TON_TOKEN",
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
