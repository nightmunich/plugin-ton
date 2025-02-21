/**
 * @description This class provides functionality to manage TON Connect wallet connections. 
 * It includes connecting to a wallet, disconnecting from a wallet, and restoring previous sessions. 
 * The class also handles caching of wallet connections to allow seamless reconnections when necessary. 
 * It supports initializing the connection, checking wallet support, and handling wallet states through the TonConnect SDK.
 */

import {
    elizaLogger,
    IAgentRuntime,
    Memory,
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

const DEFAULT_BRIDGE_URL = 'https://bridge.tonapi.io/bridge';
const DEFAULT_UNIVERSAL_LINK = 'https://app.tonkeeper.com/ton-connect'

class Storage implements IStorage{
    constructor(
        private cacheManager: ICacheManager,
        private cacheKey: string,
        private ttl?: number,
    ) {}


    public async readFromCache<T>(key: string): Promise<T | null> {
        const cached = await this.cacheManager.get<T>(
            path.join(this.cacheKey, key)
        );
        return cached;
    }

    public async writeToCache<T>(key: string, data: T): Promise<void> {
        await this.cacheManager.set(path.join(this.cacheKey, key), data, {
            expires: this.ttl ?? Date.now() + 15 * 60 * 1000, // 15 minutes
        });
    }

    // Bottom functions are required by TonConnect
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
    public callback: HandlerCallback
    private storage: Storage
    private state: State
    private message: Memory

    constructor(runtime: IAgentRuntime, state: State, callback: HandlerCallback, message: Memory) {
        this.runtime = runtime;
        this.state = state;
        this.callback = callback;
        this.storage = new Storage(runtime.cacheManager, `plugin-ton/users/${message.userId}`);
        this.manifestUrl = runtime.getSetting("TON_CONNECT_MANIFEST_URL") ?? null;
        if (!this.manifestUrl || this.manifestUrl.trim() === "") {
            throw new Error("Manifest URL cannot be empty.");
        }
        this.message = message;
        this.connector = new TonConnect({ manifestUrl: this.manifestUrl , storage: this.storage});
    }


    public async isConnected():Promise<boolean>{
        return this.connector.connected;
    }

    
    public async getSupportedWallets():Promise<WalletInfo[]>{
        return this.connector.getWallets();
    }


    public async setConnector(): Promise<TonConnect>{
        const cached_wallet = await this.storage.readFromCache<Wallet>("CONNECTOR");
        this.connector = new TonConnect({ 
            manifestUrl: this.manifestUrl, 
            storage: this.storage
        });

        if (cached_wallet) {
            await this.connector.restoreConnection();
            elizaLogger.info("The connector was cached, restored connection!");
            return this.connector
        }
        this.connector.connect({
            universalLink: DEFAULT_UNIVERSAL_LINK,
            bridgeUrl: DEFAULT_BRIDGE_URL
        });

        return this.connector
    }


    public async connect(universalLink: string = DEFAULT_UNIVERSAL_LINK, bridgeUrl: string = DEFAULT_BRIDGE_URL): Promise<TonConnect> {
        const cached_wallet = await this.storage.readFromCache<Wallet>("CONNECTOR");
        this.connector = new TonConnect({
            manifestUrl: this.manifestUrl, 
            storage: this.storage
        }); 
        
        if (cached_wallet) {
            await this.connector.restoreConnection();
            elizaLogger.info("The connector was cached, restored connection!");
            return this.connector;
        }

        const walletConnectionSource = {
            universalLink: universalLink,
            bridgeUrl: bridgeUrl
        }
        
        const connectLink = this.connector.connect(walletConnectionSource);
        this.callback({
            text: connectLink
        })
        const unsubscribe = this.connector.onStatusChange(
            walletInfo => {
                this.storage.writeToCache<Wallet>("CONNECTOR", walletInfo);
                elizaLogger.info(`Cached TON connect session for the user: ${this.message.userId}`);
                unsubscribe();
            } 
        );
        
        if (this.connector.connected) {
            elizaLogger.info("TonConnect session created successfully!");
        }

        return this.connector;
    }


    public async disconnect(): Promise<boolean> {
        const cached_wallet = await this.storage.readFromCache<Wallet>("CONNECTOR");
        if (!cached_wallet) return false;
        try {
            this.connector = new TonConnect({ 
                manifestUrl: this.manifestUrl,
                storage: this.storage 
            });
            await this.connector.restoreConnection();
            await this.connector.disconnect();
            await this.storage.removeItem("CONNECTOR")            
            return true;
        } catch (error) {
            elizaLogger.error("Error disconnecting from TonConnect:", error);
            return false;
        }
    }

}
