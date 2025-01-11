import { elizaLogger } from "@elizaos/core";
import axios, { AxiosInstance } from "axios";
import { DexScreenerData, DexScreenerPair } from "..//types";

export class DexScreenerApi {
    private client: AxiosInstance;
    private static instance: DexScreenerApi;

    private constructor() {
        const API_URL = "https://api.dexscreener.com";

        if (!API_URL) {
            throw new Error(
                "Missing DEXSCREENER_API_URL environment variable. Please set it in your .env file"
            );
        }

        this.client = axios.create({
            baseURL: API_URL,
            headers: {
                "Content-Type": "application/json",
            },
        });
    }

    public static getInstance(): DexScreenerApi {
        if (!DexScreenerApi.instance) {
            DexScreenerApi.instance = new DexScreenerApi();
        }
        return DexScreenerApi.instance;
    }

    async getTokenInfo(tokenAddress: string): Promise<DexScreenerPair> {
        try {
            const response = await this.client.get<DexScreenerData>(
                `/latest/dex/tokens/${tokenAddress}`
            );

            if (!response.data.pairs || response.data.pairs.length === 0) {
                elizaLogger.warn("Token info fetch failed", {
                    error: response.statusText,
                });
                throw new Error(response.statusText);
            }

            return response.data.pairs[0];
        } catch (error) {
            elizaLogger.error("Token info error", { error });
            throw error;
        }
    }
}
