import {
    elizaLogger,
    composeContext,
    type Content,
    type HandlerCallback,
    ModelClass,
    generateObject,
    type IAgentRuntime,
    type Memory,
    type State,
} from "@elizaos/core";

import {
    UserRejectsError,
    CHAIN
} from "@tonconnect/sdk"

import { toNano } from "@ton/ton";

import { z } from "zod";

export interface TransferContent extends Content {
    recipient: string;
    amount: string;
}
import { TonConnectWalletProvider } from "../providers/tonConnect.ts";

function isTransferContent(content: Content): content is TransferContent {
    elizaLogger.log("Content for transfer", content);
    return (
        typeof content.recipient === "string" &&
        typeof content.amount === "string"
    );
}

const transferTemplate = `Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined.

Example response:
\`\`\`json
{
    "recipient": "EQCGScrZe1xbyWqWDvdI6mzP-GAcAWFv6ZXuaJOuSqemxku4",
    "amount": "1"
}
\`\`\`

{{recentMessages}}

Given the recent messages, extract the following information about the requested token transfer:
- Recipient wallet address
- Amount to transfer

Respond with a JSON markdown block containing only the extracted values.`;

export class TransferAction {
    private tonConnectProvider: TonConnectWalletProvider;

    constructor(tonConnectProvider: TonConnectWalletProvider) {
        this.tonConnectProvider = tonConnectProvider;
    }

    public async transfer(params: TransferContent): Promise<string> {
        elizaLogger.info(
            `Transferring: ${params.amount} tokens to (${params.recipient})`,
        );

        const connector = await this.tonConnectProvider.setConnector();

        if (!connector.connected) {
            elizaLogger.error("Wallet is not connected to send the transaction!");
        }
        
        const transaction = {
            validUntil: Math.floor(Date.now() / 1000) + 60, // 60 sec
            messages: [
                {
                    network: CHAIN.MAINNET,
                    address: params.recipient,
                    amount: toNano(params.amount).toString(),
                    payload: "Transaction done through elizaOS plugin-ton."
                }
            ]
        }
        
        try {
            const result = await connector.sendTransaction(transaction);
            // (Optional TODO) In future one can use signed boc (result.boc) to find the transaction

            elizaLogger.info("Transaction was sent successfully.");
            return result.boc;

        } catch (e) {
            if (e instanceof UserRejectsError) {
                elizaLogger.error("The user rejected the transaction.");
            } else {
                elizaLogger.error("Transaction failed.")
                elizaLogger.error(e.message);
            }
            return null;
        }
    }
}

const buildTransferDetails = async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
): Promise<TransferContent> => {

    // Initialize or update state
    if (!state) {
        state = (await runtime.composeState(message)) as State;
    } else {
        state = await runtime.updateRecentMessageState(state);
    }

    // Define the schema for the expected output
    const transferSchema = z.object({
        recipient: z.string(),
        amount: z.string(),
    });

    // Compose transfer context
    const transferContext = composeContext({
        state,
        template: transferTemplate,
    });

    // Generate transfer content with the schema
    const content = await generateObject({
        runtime,
        context: transferContext,
        schema: transferSchema,
        modelClass: ModelClass.SMALL,
    });

    let transferContent: TransferContent = content.object as TransferContent;

    if (transferContent === undefined) {
        transferContent = content as unknown as TransferContent;
    }

    return transferContent;
};

export default {
    name: "SEND_TON_TOKEN_TON_CONNECT",
    similes: ["SEND_TON_TON_CONNECT", "SEND_TON_TOKENS_TON_CONNECT"],
    description: "Call this action to send TON tokens to another wallet address. Supports sending any amount of TON to any valid TON wallet address. Transaction will be signed and broadcast to the TON blockchain.",
    validate: async (_runtime: IAgentRuntime) => {
        return true;
    },
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback?: HandlerCallback,
    ) => {
        elizaLogger.log("Starting SEND_TOKEN_TON_CONNECT handler...");

        const transferDetails = await buildTransferDetails(
            runtime,
            message,
            state,
        );

        // Validate transfer content
        if (!isTransferContent(transferDetails)) {
            elizaLogger.error("Invalid content for SEND_TON_TOKEN_TON_CONNECT action.");
            if (callback) {
                callback({
                    text: "Unable to process transfer request. Invalid content provided. Please provide the recipient address and the amount in grams.",
                    content: { error: "Invalid transfer content" },
                });
            }
            return false;
        }

        try {
            // TODO check token balance before transfer
            const tonConnectProvider = new TonConnectWalletProvider(
                runtime,
                state,
                callback,
                message
            );

            const action = new TransferAction(tonConnectProvider);
            const hash = await action.transfer(transferDetails);

            if (callback) {
                callback({
                    // TODO wait for transaction to complete
                    text: `Successfully transferred ${transferDetails.amount} TON to ${transferDetails.recipient}, Transaction: ${hash}`,
                    content: {
                        success: true,
                        hash: hash,
                        amount: transferDetails.amount,
                        recipient: transferDetails.recipient,
                    },
                });
            }

            return true;
        } catch (error) {
            elizaLogger.error("Error during token transfer:", error);
            if (callback) {
                callback({
                    text: `Error transferring tokens: ${error.message}`,
                    content: { error: error.message },
                });
            }
            return false;
        }
    },
    template: transferTemplate,
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Send 1 TON tokens to EQCGScrZe1xbyWqWDvdI6mzP-GAcAWFv6ZXuaJOuSqemxku4",
                    action: "SEND_TON_TOKEN_TON_CONNECT",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "I'll send 1 TON tokens now...",
                    action: "SEND_TON_TOKEN_TON_CONNECT",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Successfully sent 1 TON tokens to EQCGScrZe1xbyWqWDvdI6mzP-GAcAWFv6ZXuaJOuSqemxku4, Transaction: c8ee4a2c1bd070005e6cd31b32270aa461c69b927c3f4c28b293c80786f78b43",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Transfer 0.5 TON to EQCD39VS5jcptHL8vMjEXrzGaRcCVYto7HUn4bpAOg8xqB2N",
                    action: "SEND_TON_TOKEN_TON_CONNECT",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Processing transfer of 0.5 TON...",
                    action: "SEND_TON_TOKEN_TON_CONNECT",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Successfully sent 0.5 TON to EQCD39VS5jcptHL8vMjEXrzGaRcCVYto7HUn4bpAOg8xqB2N, Transaction: c8ee4a2c1bd070005e6cd31b32270aa461c69b927c3f4c28b293c80786f78b43",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Please move 2.5 TON to EQByzSQE5Mf_UBf5YYVF_fRhP_oZwM_h7mGAymWBjxkY5yVm",
                    action: "SEND_TON_TOKEN_TON_CONNECT",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Initiating transfer of 2.5 TON...",
                    action: "SEND_TON_TOKEN_TON_CONNECT",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Successfully sent 2.5 TON to EQByzSQE5Mf_UBf5YYVF_fRhP_oZwM_h7mGAymWBjxkY5yVm, Transaction: c8ee4a2c1bd070005e6cd31b32270aa461c69b927c3f4c28b293c80786f78b43",
                },
            },
        ],
    ],
};
