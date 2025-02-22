import { elizaLogger } from "@elizaos/core";
import axios, { AxiosInstance } from "axios";
import {
    BotScanWalletResponse,
    TimeframeType,
    TokenResponse,
    TopKolsResponse,
    TrendingTokenParams,
    TrendingTokenResponse,
} from "../types";

export const validTimeframes = [
    "5m",
    "15m",
    "30m",
    "1h",
    "2h",
    "3h",
    "4h",
    "5h",
    "6h",
    "12h",
    "24h",
] as const;

export class TopWalletsAPI {
    private client: AxiosInstance;
    private static instance: TopWalletsAPI;

    private constructor() {
        const API_KEY = process.env.TOPWALLETS_API_KEY;
        const API_URL = process.env.TOPWALLETS_API_URL;

        if (!API_KEY) {
            throw new Error(
                "Missing TOPWALLETS_API_KEY environment variable. Please set it in your .env file"
            );
        }

        this.client = axios.create({
            baseURL: API_URL || "https://www.topwallets.ai",
            headers: {
                Authorization: `Bearer ${API_KEY}`,
                "Content-Type": "application/json",
            },
        });
    }

    public static getInstance(): TopWalletsAPI {
        if (!TopWalletsAPI.instance) {
            TopWalletsAPI.instance = new TopWalletsAPI();
        }
        return TopWalletsAPI.instance;
    }

    async scanWallet(address: string): Promise<BotScanWalletResponse> {
        try {
            const response = await this.client.post<BotScanWalletResponse>(
                "/api/bot/solana/scan/wallet",
                { address }
            );

            if (!response.data.success) {
                elizaLogger.warn("Wallet scan failed", {
                    error: response.data.message,
                });
                throw new Error(response.data.message);
            }

            return response.data;
        } catch (error) {
            elizaLogger.error("Wallet scan error", { error });
            throw error;
        }
    }

    async getTrendingTokens(
        params?: TrendingTokenParams
    ): Promise<TrendingTokenResponse> {
        try {
            const timeframe = params?.timeframe || "24h";
            const count = params?.count || 5;

            if (!validTimeframes.includes(timeframe as TimeframeType)) {
                throw new Error(
                    `Invalid timeframe. Must be one of: ${validTimeframes.join(
                        ", "
                    )}`
                );
            }

            const response = await this.client.get<TrendingTokenResponse>(
                `/api/bot/solana/trending-tokens?timeframe=${timeframe}&count=${count}`
            );

            if (!response.data.success) {
                elizaLogger.warn("Trending tokens fetch failed", {
                    error: response.data.message,
                });
                throw new Error(response.data.message);
            }

            return response.data;
        } catch (error) {
            elizaLogger.error("Trending tokens error", { error });
            throw error;
        }
    }

    async getTokenInfo(address: string): Promise<TokenResponse> {
        try {
            const response = await this.client.get<TokenResponse>(
                `/api/bot/solana/token?address=${address}`
            );

            if (!response.data.success) {
                elizaLogger.warn("Token info fetch failed", {
                    error: response.data.message,
                });
                throw new Error(response.data.message);
            }

            return response.data;
        } catch (error) {
            elizaLogger.error("Token info error", { error });
            throw error;
        }
    }

    async getTopKols(limit: number = 100): Promise<TopKolsResponse> {
        try {
            const response = await this.client.get<TopKolsResponse>(
                `/api/bot/solana/top-kols?limit=${limit}`
            );

            if (!response.data.success) {
                elizaLogger.warn("Top KOLs fetch failed", {
                    error: response.data.message,
                });
                throw new Error(response.data.message);
            }

            return response.data;
        } catch (error) {
            elizaLogger.error("Top KOLs error", { error });
            throw error;
        }
    }

    async getTopKolsPicture(period: string = "1d"): Promise<Buffer> {
        try {
            const response = await this.client.get(
                `/api/bot/solana/top-kols/images?period=${period}`,
                {
                    responseType: "arraybuffer",
                }
            );

            if (!response.data) {
                elizaLogger.warn("Top KOLs image fetch failed");
                throw new Error("Failed to fetch Top KOLs image");
            }

            return Buffer.from(response.data);
        } catch (error) {
            elizaLogger.error("Top KOLs image error", { error });
            throw error;
        }
    }
}
