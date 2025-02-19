import {
    elizaLogger,
    IAgentRuntime,
    Memory,
    Provider,
    ICacheManager,
    State,
    type HandlerCallback
} from "@elizaos/core";

import {
    TonConnect,
    Wallet,
    WalletInfo,
    IStorage
} from "@tonconnect/sdk";

import * as path from "node:path";

class Storage implements IStorage{
    // private cache: NodeCache
    constructor(
        public cacheManager: ICacheManager,
        private cacheKey,
        // ttl?: number,
    ) {}


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
        // Read a string value from cache
        const cachedData = await this.readFromCache<string>(key);
        return cachedData;
    }

    public async setItem(key: string, value: string): Promise<void> {
        // Write a string value to cache
        await this.writeToCache<string>(key, value);
    }

    public async removeItem(key: string): Promise<void>{
        await this.cacheManager.delete(path.join(this.cacheKey, key));
    }
}

export class TonConnectWalletProvider {
    private manifestUrl: string;
    private readonly runtime: IAgentRuntime;
    private connector?: TonConnect;
    // private state: { connected: boolean }; // Properly initialized
    public callback: HandlerCallback
    private storage: Storage
    private state: State
    private message: Memory

    constructor(runtime: IAgentRuntime, state: State, callback: HandlerCallback, message: Memory) {
        // super(cacheManager, "ton/data");
        this.runtime = runtime;
        this.state = state;
        this.callback = callback;
        this.storage = new Storage(runtime.cacheManager, `plugin-ton/users/${message.userId}`);
        this.manifestUrl = runtime.getSetting("TON_CONNECT_MANIFEST_URL") ?? null;
        if (!this.manifestUrl || this.manifestUrl.trim() === "") {
            throw new Error("Manifest URL cannot be empty.");
        }

        // this.state = { connected: false }; // Proper initialization
        this.message = message;
        // super.setCachedData("connector",undefined)
    }

    async isConnected():Promise<boolean>{
        return this.connector.connected
    }



    async connect(universalLink: string, bridgeUrl: string): Promise<TonConnect> {
        if (!this.manifestUrl) {
            throw new Error("Manifest URL is required for TonConnect.");
        }

        elizaLogger.info(this.message.userId);
        const cached_wallet = await this.storage.readFromCache<Wallet>("connector_tmp");
        this.connector = new TonConnect({ manifestUrl: this.manifestUrl , storage: this.storage}); 
        
        if (cached_wallet) {
            await this.connector.restoreConnection();
            elizaLogger.info("The connector was cached, restored connection!");
            return this.connector
        }

        elizaLogger.info(universalLink);
        elizaLogger.info("OPKAKA");

        if (!universalLink && !bridgeUrl) {
            universalLink = 'https://app.tonkeeper.com/ton-connect';
            bridgeUrl = 'https://bridge.tonapi.io/bridge';
        }

        const walletConnectionSource = {
            // universalLink: 'https://app.tonkeeper.com/ton-connect',
            // bridgeUrl: 'https://bridge.tonapi.io/bridge'
            universalLink: universalLink,
            bridgeUrl: bridgeUrl
        }
        
        const connectLink = this.connector.connect(walletConnectionSource);
        this.callback({text: connectLink})
        const unsubscribe = this.connector.onStatusChange(
            walletInfo => {
                this.storage.writeToCache<Wallet>("connector_tmp", walletInfo);
                elizaLogger.info(`Cached TON connect session for the user: ${this.message.userId}`);
                unsubscribe();
            } 
        );
        
        if (this.connector.connected) {
            elizaLogger.info("WALLET CONNECTED");
        }

        return this.connector;
    }

    async disconnect(): Promise<boolean> {
        // if (!this.connector) return false;
        const cached_wallet = await this.storage.readFromCache<Wallet>("connector_tmp");
        if (!cached_wallet) return false;

        try {
            this.connector = new TonConnect({ manifestUrl: this.manifestUrl , storage: this.storage });
            await this.connector.restoreConnection();
            await this.connector.disconnect();

            // this.connector = undefined;
            this.storage.removeItem("connector_tmp")

            const cached_wallet = await this.storage.readFromCache<Wallet>("connector_tmp");

            elizaLogger.info(cached_wallet == null)

            return true;
        } catch (error) {
            console.error("Error disconnecting from TonConnect:", error);
            return false;
        }
    }

    async getSupportedWallets():Promise<WalletInfo[]>{
        return this.connector.getWallets()
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
//             //     `Error in ${PROVIDER_CONFIG.CHAIN_NAME_IN_DEXSCREENER.toUpperCase()} connector provider:`,
//             //     error,
//             // );
//             return null;
//         }
//     },
// };

