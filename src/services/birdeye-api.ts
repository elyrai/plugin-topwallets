import { elizaLogger } from "@ai16z/eliza";
import axios, { AxiosInstance } from "axios";
import { BirdeyeOHLCV, BirdeyHolders, BirdeyMarketData } from "../src/types";

export class BirdeyeApi {
    private client: AxiosInstance;
    private static instance: BirdeyeApi;

    private constructor() {
        const API_URL = "https://public-api.birdeye.so";
        const API_KEY = process.env.BIRDEYE_API_KEY;

        if (!API_KEY) {
            throw new Error(
                "Missing BIRDEYE_API_KEY environment variable. Please set it in your .env file"
            );
        }

        this.client = axios.create({
            baseURL: API_URL,
            headers: {
                "X-API-KEY": `${API_KEY}`,
                "Content-Type": "application/json",
            },
        });
    }

    public static getInstance(): BirdeyeApi {
        if (!BirdeyeApi.instance) {
            BirdeyeApi.instance = new BirdeyeApi();
        }
        return BirdeyeApi.instance;
    }

    async getOHLCV(tokenAddress: string): Promise<BirdeyeOHLCV> {
        try {
            const response = await this.client.get<BirdeyeOHLCV>(
                `/defi/ohlcv?address=${tokenAddress}&type=1D&time_from=0&time_to=10000000000`
            );

            if (
                !response.data.success ||
                response.data.data.items.length === 0
            ) {
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

    async getMarketData(tokenAddress: string): Promise<BirdeyMarketData> {
        try {
            const response = await this.client.get<BirdeyMarketData>(
                `/defi/v3/token/market-data?address=${tokenAddress}`
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
    async getTopHolders(
        tokenAddress: string,
        nb: number = 10,
        offset: number = 0
    ): Promise<BirdeyHolders> {
        try {
            const response = await this.client.get<BirdeyHolders>(
                `/defi/v3/token/holder?address=${tokenAddress}&offset=${offset}&limit=${nb}`
            );

            if (!response.data.success) {
                elizaLogger.warn("Token info fetch failed", {
                    error: response.data.message,
                });
                throw new Error(response.data.message);
            }

            elizaLogger.log("holders", response.data);

            return response.data;
        } catch (error) {
            elizaLogger.error("Token info error", { error });
            throw error;
        }
    }
}
