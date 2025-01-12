import { z } from "zod";
import { validTimeframes } from "./services/topwallets-api";

export type TimeframeType = (typeof validTimeframes)[number];

export type Source = "telegram" | "twitter" | "discord" | "unknown";

export interface RecentToken {
    symbol: string;
    name: string;
    timestamp: string;
    holding: number;
    amount: string;
    firstBuyTime: string;
    realizedPnl: string;
    roi: string;
    imageUrl: string | null;
}

export interface WalletData {
    recentTokens: RecentToken[];
    score: number;
    winrateScore: number;
    pnlScore: number;
    roiScore: number;
    address: string;
    formattedAddress: string;
    winrate: number;
    tokenTraded: number;
    averageHoldingTime: string;
    realizedPnl: string;
    unrealizedPnl: string;
    realizedRoi: string;
    unrealizedRoi: string;
    combinedRoi: string;
    realizedPnlRaw: number;
    unrealizedPnlRaw: number;
    realizedRoiRaw: number;
    unrealizedRoiRaw: number;
    combinedRoiRaw: number;
    combinedPnlRaw: number;
    totalInvested: number | string | null;
    totalInvestedFormatted: string | null;
    averageBuyAmount: number | string | null;
    averageBuyAmountFormatted: string | null;
    totalWins: number | null | string;
    totalLosses: number | null | string;
    lossPercentage: number | null;
    name: string | null;
    twitter_url: string | null;
    picture_url: string | null;
    type: "normal" | "kols";
    isFavorite?: boolean;
    updatedAt: string;
}

export interface BotScanWalletResponse {
    success: boolean;
    message: string;
    data: WalletData;
}

export interface TrendingToken {
    name: string;
    symbol: string;
    address: string;
    decimals: number;
    description: string | null;
    riskScore: number;
    liquidity: number | null;
    price: number | null;
    marketCap: number | null;
}

export interface TrendingTokenResponse {
    success: boolean;
    message: string;
    data: {
        tokens: TrendingToken[];
    };
}

export interface TokenResponse {
    success: boolean;
    message: string;
    data: {
        name: string;
        symbol: string;
        address: string;
        decimals: number;
        description: string | null;
        image: string | null;
        social: {
            twitter?: string;
            telegram?: string;
        };
        price: number | null;
        marketCap: number | null;
        liquidity: number | null;
        priceChange: {
            "1m": number | null;
            "5m": number | null;
            "15m": number | null;
            "30m": number | null;
            "1h": number | null;
            "2h": number | null;
            "3h": number | null;
            "4h": number | null;
            "5h": number | null;
            "6h": number | null;
            "12h": number | null;
            "24h": number | null;
        };
        riskScore: number;
        isRugged: boolean;
        topWallets: {
            address: string;
            name: string | null;
            twitter_url: string | null;
            picture_url: string | null;
            type: string;
            realizedPnl: string;
            realizedPnlRaw: number;
            winrate: number;
            score: number;
            historic30d: {
                realizedPnl: string;
                realizedPnlRaw: number;
                totalChange: number;
                percentageChange: number;
            } | null;
        }[];
    };
}

export interface DexScreenerPair {
    chainId: string;
    dexId: string;
    url: string;
    pairAddress: string;
    baseToken: {
        address: string;
        name: string;
        symbol: string;
    };
    quoteToken: {
        address: string;
        name: string;
        symbol: string;
    };
    priceNative: string;
    priceUsd: string;
    txns: {
        m5: { buys: number; sells: number };
        h1: { buys: number; sells: number };
        h6: { buys: number; sells: number };
        h24: { buys: number; sells: number };
    };
    volume: {
        h24: number;
        h6: number;
        h1: number;
        m5: number;
    };
    priceChange: {
        m5: number;
        h1: number;
        h6: number;
        h24: number;
    };
    liquidity: {
        usd: number;
        base: number;
        quote: number;
    };
    fdv: number;
    marketCap: number;
    pairCreatedAt: number;
    info: {
        imageUrl: string;
        websites: { label: string; url: string }[];
        socials: { type: string; url: string }[];
    };
    boosts: {
        active: number;
    };
}

export interface DexScreenerData {
    schemaVersion: string;
    pairs: DexScreenerPair[];
}

export interface OHCLVItem {
    address: string;
    c: number; // close
    h: number; // high
    l: number; // low
    o: number; // open
    type:
        | "1m"
        | "3m"
        | "5m"
        | "15m"
        | "30m"
        | "1H"
        | "2H"
        | "4H"
        | "6H"
        | "8H"
        | "12H"
        | "1D"
        | "3D"
        | "1W"
        | "1M";
    v: number; // volume
    unixTime: number;
}

export interface BirdeyeOHLCV {
    data: {
        items: OHCLVItem[];
    };
    success: boolean;
    message: string;
}

export interface BirdeyMarketData {
    data: {
        address: string;
        liquidity: number;
        price: number;
        supply: number;
        marketcap: number;
        circulating_supply: number;
        circulating_marketcap: number;
    };
    success: boolean;
    message: string;
}

export interface HolderItem {
    amount: number;
    decimals: number;
    mint: string;
    owner: string;
    token_account: string;
    ui_amount: number;
}
export interface BirdeyHolders {
    data: {
        items: HolderItem[];
    };
    success: boolean;
    message: string;
}

export const TrendingTokenSchema = z.object({
    timeframe: z.enum(validTimeframes),
    count: z.number().min(1).max(20),
});

export const TokenInfoSchema = z.object({
    contractAddress: z.string().nullable(),
    symbol: z.string().nullable(),
});

export type TrendingTokenParams = z.infer<typeof TrendingTokenSchema>;
export type TokenInfo = z.infer<typeof TokenInfoSchema>;

export const isTrendingTokenParams = (
    object: unknown
): object is TrendingTokenParams => {
    if (TrendingTokenSchema.safeParse(object).success) {
        return true;
    }
    console.error("Invalid trending token params:", object);
    return false;
};

export const isTokenInfo = (object: unknown): object is TokenInfo => {
    if (TokenInfoSchema.safeParse(object).success) {
        return true;
    }
    console.error("Invalid token info:", object);
    return false;
};

export interface TopKolsResponse {
    success: boolean;
    message: string;
    data: WalletTradingData[];
}

export interface WalletTradingData {
    all: WalletData;
    "30d": WalletData;
    "7d": WalletData;
    "1d": WalletData;
}
