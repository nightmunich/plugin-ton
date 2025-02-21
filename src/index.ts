import type { Plugin } from "@elizaos/core";
import transferAction from "./actions/transfer.ts";
import { WalletProvider } from "./providers/wallet.ts";
import tonConnectInitAction from "./actions/tonConnectInit";
import tonConnectTransferAction from "./actions/tonConnectTransfer";
import tonConnectDisconnectAction from "./actions/tonConnectDisconnect"

import { TonConnectWalletProvider } from "./providers/tonConnect.js";
// import { TonConnectWalletProvider, nativeWalletProvider } from "./providers/tonConnect.ts";

export { WalletProvider,
    TonConnectWalletProvider,
    transferAction as TransferTonToken,
    tonConnectTransferAction as TonConnectTransferTonToken,
    tonConnectInitAction as TonConnectInit,
};

export const tonPlugin: Plugin = {
    name: "ton",
    description: "Ton Plugin for Eliza",
    actions: [tonConnectInitAction, tonConnectTransferAction, tonConnectDisconnectAction],
    evaluators: [],
    // providers: [nativeWalletProvider],
    providers: [],
};

export default tonPlugin;
