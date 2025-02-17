import {
    elizaLogger,
    IAgentRuntime,
    Memory,
    Provider,
    ICacheManager,
    State,
    type HandlerCallback
} from "@elizaos/core";

import * as path from "node:path";

import {
    TonConnect,
    WalletInfoRemote,
    isWalletInfoRemote,
    UserRejectsError,
    WalletInfo,
    SendTransactionRequest,
    IStorage
} from "@tonconnect/sdk";

import NodeCache from "node-cache";


class Storage implements IStorage{
    private cache: NodeCache
    constructor(
        private cacheManager: ICacheManager,
        private cacheKey,
        ttl?: number,
    ) {
        this.cache = new NodeCache({ stdTTL: ttl || 300 });
    }

    public async readFromCache<T>(key: string): Promise<T | null> {
        const cached = await this.cacheManager.get<T>(
            path.join(this.cacheKey, key)
        );
        return cached;
    }

    public async writeToCache<T>(key: string, data: T): Promise<void> {
        await this.cacheManager.set(path.join(this.cacheKey, key), data, {
            expires: Date.now() + 15 * 60 * 1000, // 15 minutes
        });
    }

    public async getItem(key: string): Promise<string | null> {
        // Check in-memory cache first
        const cachedData = this.cache.get<string>(key);
        if (cachedData) {
            return cachedData;
        }

        // Check file-based cache
        const fileCachedData = await this.readFromCache<string>(key);
        if (fileCachedData) {
            // Populate in-memory cache
            this.cache.set(key, fileCachedData);
            return fileCachedData;
        }

        return null;
    }

    public async setItem(key: string, value: string): Promise<void> {
        // Set in-memory cache
        this.cache.set(key, value);

        // Write to file-based cache
        await this.writeToCache(key, value);
    }
    public async removeItem(key: string): Promise<void>{

    }
}

export class TonConnectWalletProvider {
    private manifestUrl: string;
    private readonly runtime: IAgentRuntime;
    private wallet?: TonConnect;
    private state: { connected: boolean }; // Properly initialized
    public callback: HandlerCallback
    private storage: Storage

    constructor(runtime: IAgentRuntime, callback: HandlerCallback,manifestUrl: string) {
        // super(cacheManager, "ton/data");
        this.runtime = runtime;
        this.callback = callback
        this.storage = new Storage(runtime.cacheManager, "ton/data")
        if (!manifestUrl || manifestUrl.trim() === "") {
            throw new Error("Manifest URL cannot be empty.");
        }
        this.manifestUrl = manifestUrl;
        this.state = { connected: false }; // Proper initialization
        // super.setCachedData("wallet",undefined)
    }

    async connect(): Promise<TonConnect> {
        if (!this.manifestUrl) {
            throw new Error("Manifest URL is required for TonConnect.");
        }

        const cached_wallet = await this.storage.readFromCache<TonConnect>("wallet");
        if (cached_wallet != null) {
            this.wallet = cached_wallet;
        } else {
            this.wallet = new TonConnect({ manifestUrl: this.manifestUrl , storage: this.storage});
        }

        this.state.connected = true;
        // super.setCachedData("wallet",this.wallet)
        const walletConnectionSource = {
            universalLink: 'https://app.tonkeeper.com/ton-connect',
            bridgeUrl: 'https://bridge.tonapi.io/bridge'
        }
        
        const universalLink = this.wallet.connect(walletConnectionSource);
        this.callback({text: universalLink})
        const unsubscribe = this.wallet.onStatusChange(
            walletInfo => {
                this.callback({text: "Ignat"})

                this.storage.writeToCache("wallet", walletInfo)
            } 
        );
        if (this.wallet.connected) {
            elizaLogger.log("WALLET CONNECTED");
        }

        this.storage.writeToCache<TonConnect>("wallet", this.wallet);

        const walletList = await this.wallet.getWallets();

        let sss = ""

        for (let i = 0; i < walletList.length; i++) {
            // console.log(numbers[i]);
            sss += " "
            sss += walletList[i].name
        }

        this.callback({
            text: sss
        })
        // Listen for status changes
        // this.wallet.onStatusChange((wallet) => {
        //     if (!wallet) {
        //         return;
        //     }

        //     const tonProof = wallet.connectItems?.tonProof;
        //     if (tonProof) {
        //         if ("proof" in tonProof) {
        //             // send proof to your backend
        //             // e.g. myBackendCheckProof(tonProof.proof, wallet.account);
        //             return;
        //         }

        //         console.error(tonProof.error);
        //     }
        // });

        return this.wallet;
    }

    async disconnect(): Promise<boolean> {
        if (!this.wallet) return false;
        try {
            await this.wallet.disconnect();
            this.state.connected = false;
            this.wallet = undefined;
            return true;
        } catch (error) {
            console.error("Error disconnecting from TonConnect:", error);
            return false;
        }
    }

    async reconnect(): Promise<TonConnect | null> {
        if (this.state.connected && this.wallet) return this.wallet;

        return this.connect();
    }
}

// export const nativeWalletProvider: Provider = {
//     async get(
//         runtime: IAgentRuntime,
//         // eslint-disable-next-line
//         _message: Memory,
//         // eslint-disable-next-line
//         _state?: State
//     ): Promise<string | null> {
//         try {
//             const walletProvider = new TonConnectWalletProvider(runtime.cacheManager, runtime,runtime.getSetting("MANIFEST_URL"));
//             // const formattedPortfolio =
//                 // await walletProvider.getFormattedPortfolio(runtime);
//             // console.log(formattedPortfolio);
//             return "";
//         } catch (error) {
//             // console.error(
//             //     `Error in ${PROVIDER_CONFIG.CHAIN_NAME_IN_DEXSCREENER.toUpperCase()} wallet provider:`,
//             //     error,
//             // );
//             return null;
//         }
//     },
// };

