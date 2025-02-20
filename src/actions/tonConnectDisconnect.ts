import { elizaLogger } from "@elizaos/core";
import {
    type ActionExample,
    type HandlerCallback,
    type IAgentRuntime,
    type Memory,
    type State,
    type Action,
} from "@elizaos/core";
import { TonConnectWalletProvider } from "../providers/tonConnect";


export default {
    name: "DISCONNECT_WALLET",
    similes: ["DISCONNECT_TON_CONNECT_WALLET", "DISCONNECT_TON_WALLET", "DISCONNECT_MY_WALLET"],
    description: "Call this action to disconnect the current TonConnect Wallet.",
    validate: async (_runtime: IAgentRuntime) => {
        return true;
    },    
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback?: HandlerCallback,
    ):Promise<boolean> => {
        elizaLogger.info("Starting disconnecting wallet.");
        
        if (!state) {
            state = (await runtime.composeState(message)) as State;
        } else {
            state = await runtime.updateRecentMessageState(state);
        }

        const tonConnectProvider = new TonConnectWalletProvider(
            runtime,
            state,
            callback,
            message
        );

        const disconnected = await tonConnectProvider.disconnect();
        
        if (disconnected) {
            elizaLogger.info("Succesfully disconnected.")
            if (callback) {
                callback({
                    text: "Successfully disconnected."
                })
            }
            return true;
        }

        return false;
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "I want to disconnect my wallet from TonConnect",
                    action: "DISCONNECT_WALLET",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Disconnecting your wallet...",
                    action: "DISCONNECT_WALLET",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Your wallet has been successfully disconnected.",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Log me out of my TON wallet",
                    action: "DISCONNECT_WALLET",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Processing your request...",
                    action: "DISCONNECT_WALLET",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "You have been logged out of your TON wallet.",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Can you disconnect my wallet?",
                    action: "DISCONNECT_WALLET",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Sure! Disconnecting now...",
                    action: "DISCONNECT_WALLET",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Done! Your wallet is now disconnected.",
                },
            },
        ],
    ] as ActionExample[][],
} as Action;
