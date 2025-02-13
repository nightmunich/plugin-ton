import {
    elizaLogger,
    IAgentRuntime,
    Memory,
    Provider,
    ICacheManager,
    State,
} from "@elizaos/core";

import * as path from "node:path";

import {
    TonConnect,
    WalletInfoRemote,
    isWalletInfoRemote,
    UserRejectsError,
    WalletInfo,
    SendTransactionRequest,
} from "@tonconnect/sdk";

import NodeCache from "node-cache";


class BaseCachedProvider{
    private cache: NodeCache
    constructor(
        private cacheManager: ICacheManager,
        private cacheKey,
        ttl?: number
    ) {
        this.cache = new NodeCache({ stdTTL: ttl || 300 });
    }

    private async readFromCache<T>(key: string): Promise<T | null> {
        const cached = await this.cacheManager.get<T>(
            path.join(this.cacheKey, key)
        );
        return cached;
    }

    private async writeToCache<T>(key: string, data: T): Promise<void> {
        await this.cacheManager.set(path.join(this.cacheKey, key), data, {
            expires: Date.now() + 15 * 60 * 1000, // 15 minutes
        });
    }

    protected async getCachedData<T>(key: string): Promise<T | null> {
        // Check in-memory cache first
        const cachedData = this.cache.get<T>(key);
        if (cachedData) {
            return cachedData;
        }

        // Check file-based cache
        const fileCachedData = await this.readFromCache<T>(key);
        if (fileCachedData) {
            // Populate in-memory cache
            this.cache.set(key, fileCachedData);
            return fileCachedData;
        }

        return null;
    }

    protected async setCachedData<T>(cacheKey: string, data: T): Promise<void> {
        // Set in-memory cache
        this.cache.set(cacheKey, data);

        // Write to file-based cache
        await this.writeToCache(cacheKey, data);
    }
}

export class TonConnectWalletProvider extends BaseCachedProvider {
    private manifestUrl: string;
    private readonly runtime: IAgentRuntime;
    private wallet?: TonConnect;
    private state: { connected: boolean }; // Properly initialized

    constructor(cacheManager: ICacheManager, runtime: IAgentRuntime, manifestUrl: string) {
        super(cacheManager, "ton/data");
        this.runtime = runtime;

        if (!manifestUrl || manifestUrl.trim() === "") {
            throw new Error("Manifest URL cannot be empty.");
        }
        this.manifestUrl = manifestUrl;
        this.state = { connected: false }; // Proper initialization
        super.setCachedData("wallet",undefined)
    }

    async connect(): Promise<TonConnect> {
        if (!this.manifestUrl) {
            throw new Error("Manifest URL is required for TonConnect.");
        }

        this.wallet = new TonConnect({ manifestUrl: this.manifestUrl });
        this.state.connected = true;
        super.setCachedData("wallet",this.wallet)

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

export const nativeWalletProvider: Provider = {
    async get(
        runtime: IAgentRuntime,
        // eslint-disable-next-line
        _message: Memory,
        // eslint-disable-next-line
        _state?: State
    ): Promise<string | null> {
        try {
            const walletProvider = new TonConnectWalletProvider(runtime.cacheManager, runtime,runtime.getSetting("MANIFEST_URL"));
            // const formattedPortfolio =
                // await walletProvider.getFormattedPortfolio(runtime);
            // console.log(formattedPortfolio);
            return "";
        } catch (error) {
            // console.error(
            //     `Error in ${PROVIDER_CONFIG.CHAIN_NAME_IN_DEXSCREENER.toUpperCase()} wallet provider:`,
            //     error,
            // );
            return null;
        }
    },
};

