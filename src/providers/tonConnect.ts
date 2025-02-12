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

    private async getCachedData<T>(key: string): Promise<T | null> {
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

    private async setCachedData<T>(cacheKey: string, data: T): Promise<void> {
        // Set in-memory cache
        this.cache.set(cacheKey, data);

        // Write to file-based cache
        await this.writeToCache(cacheKey, data);
    }
}

export class TonConnectWalletProvider extends BaseCachedProvider{
    constructor(
        cacheManager: ICacheManager,
    ){
        super(cacheManager, "ton/data");
    }
}
