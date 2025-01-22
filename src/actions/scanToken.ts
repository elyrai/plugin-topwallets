import {
    Action,
    Content,
    elizaLogger,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    State,
} from "@elizaos/core";
import { isAxiosError } from "axios";
import { BirdeyeApi } from "../services/birdeye-api";
import { TopWalletsAPI } from "../services/topwallets-api";
import { HolderItem, OHCLVItem, Source, TokenResponse } from "../types";
import {
    analyzeMetrics,
    formatNumber,
    formatPercentages,
    generateAIAnalysis,
    getTimeAgo,
} from "../utils/analysis";

function getMedalEmoji(index: number): string {
    switch (index) {
        case 0:
            return "🥇";
        case 1:
            return "🥈";
        case 2:
            return "🥉";
        default:
            return "•";
    }
}

function getRiskScoreEmoji(riskScore: number): string {
    if (riskScore >= 8) {
        return "🟩";
    } else if (riskScore >= 4) {
        return "🟧";
    } else {
        return "🟥";
    }
}

function getAth(data: OHCLVItem[]): {
    high: number;
    date: number;
} {
    const ath = data.reduce(
        (acc, item) => {
            if (item.h > acc.high) {
                acc = { high: item.h, unixTime: item.unixTime };
            }
            return acc;
        },
        { high: 0, unixTime: 0 }
    );

    return {
        high: ath.high,
        date: ath.unixTime * 1000,
    };
}

function formatWalletName(
    wallet: TokenResponse["data"]["topWallets"][0]
): string {
    const name =
        wallet.name ||
        wallet.address.slice(0, 4) + "..." + wallet.address.slice(-4);
    return wallet.type === "kols" ? `⭐ ${name}` : name;
}

async function getTopPercentHolders(tokenAddress: string): Promise<number[]> {
    try {
        const apiBirdeye = BirdeyeApi.getInstance();

        const [topHolders, marketData] = await Promise.all([
            apiBirdeye.getTopHolders(tokenAddress),
            apiBirdeye.getMarketData(tokenAddress),
        ]);

        const totalSupply = marketData.data.circulating_supply;
        const percentsHolder = topHolders.data.items.map(
            (holder: HolderItem) => {
                return parseFloat(
                    ((holder.ui_amount / totalSupply) * 100).toFixed(2)
                );
            }
        );
        return percentsHolder;
    } catch (error) {
        console.error("Token scan error", {
            error,
            address: tokenAddress,
            errorMessage: isAxiosError(error)
                ? error.response?.data?.message || error.message
                : error instanceof Error
                  ? error.message
                  : "Unknown error",
            isAxiosError: isAxiosError(error),
        });
        return [];
    }
}

export const scanTokenAction: Action = {
    name: "SCAN_TOKEN",
    similes: [
        "CHECK_TOKEN",
        "ANALYZE_TOKEN",
        "GET_TOKEN_INFO",
        "TOKEN_ANALYSIS",
    ],
    description:
        "Analyze a Solana token to get detailed price, liquidity, and risk metrics",
    validate: async (runtime: IAgentRuntime, message: Memory) => {
        const text = (message.content as Content).text;
        const solanaAddressRegex = /[1-9A-HJ-NP-Za-km-z]{32,44}/g;

        if (!text || typeof text !== "string") {
            return false;
        }

        return (
            solanaAddressRegex.test(text) ||
            /\$[A-Za-z]+/i.test(text) ||
            /token|price|analysis/i.test(text)
        );
    },
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown } = {},
        callback?: HandlerCallback
    ): Promise<boolean> => {
        if (!callback) {
            throw new Error("Callback is required for scanToken action");
        }

        const source = state.source as Source;
        const text = (message.content as Content).text;
        const solanaAddressRegex = /[1-9A-HJ-NP-Za-km-z]{32,44}/g;
        const matches = text.match(solanaAddressRegex);

        elizaLogger.debug("Processing scanToken request", {
            text,
            matches,
            hasMatches: !!matches?.length,
        });

        if (!matches?.length) {
            await callback({
                text: "I couldn't find a valid token address. Please provide a valid Solana token address.",
            });
            return true;
        }

        const address = matches[0];

        try {
            const api = TopWalletsAPI.getInstance();
            const apiBirdeye = BirdeyeApi.getInstance();

            const response = await api.getTokenInfo(address);
            const tokenData = response.data;

            // Check if the token was created less than 24h ago
            let responseOhclv: any;
            if (
                tokenData.pairCreatedAt &&
                new Date(tokenData.pairCreatedAt * 1000).getTime() >
                    Date.now() - 24 * 60 * 60 * 1000
            ) {
                responseOhclv = await apiBirdeye.getOHLCV(address, "1H");
            } else {
                responseOhclv = await apiBirdeye.getOHLCV(address, "1D");
            }

            const priceAth = getAth(responseOhclv.data.items);

            const topPercentHolders = await getTopPercentHolders(address);

            elizaLogger.debug("Token data received", {
                address,
                symbol: tokenData.symbol,
                hasPrice: !!tokenData.price,
                hasLiquidity: !!tokenData.liquidity,
                hasSocial: !!tokenData.social,
            });

            const metrics = analyzeMetrics(tokenData);
            const chartUrl = `https://dexscreener.com/solana/${address}`;

            let analysisText = `📊 Token Analysis:\n`;

            if (source === "telegram" && tokenData.description) {
                analysisText += `Token Information:\n`;
                analysisText += `• Name: ${tokenData.name}\n`;
                analysisText += `• Address: ${address}\n`;
                analysisText += `• Description: ${tokenData.description}\n`;
                analysisText += `\nFinancial Metrics:\n`;
            }

            analysisText += `💰 Price: $${
                tokenData.price?.toFixed(6) || "N/A"
            } ⇨ ATH: $${priceAth.high.toFixed(6)} [${getTimeAgo(
                priceAth.date
            )}]\n`;

            analysisText += `🪙 MC: $${formatNumber(tokenData.marketCap)}\n`;
            analysisText += `💎 FDV: $${formatNumber(tokenData.fdv)}\n`;

            analysisText += `${getRiskScoreEmoji(
                tokenData.riskScore
            )} Risk: ${tokenData.riskScore}/10\n`;

            analysisText += `💦 Liq: $${formatNumber(tokenData.liquidity)}\n`;
            analysisText += `📊 Vol: $${formatNumber(
                tokenData.volume.h24
            )} 🕰️ Age: ${getTimeAgo(tokenData.pairCreatedAt * 1000)}\n`;

            if (source !== "telegram") {
                const priceChange24h = tokenData.priceChange["24h"];
                const changeIcon = priceChange24h >= 0 ? "📈" : "📉";
                analysisText += `📈 24h Change: ${changeIcon} ${
                    priceChange24h?.toFixed(2) || "0"
                }%\n`;
            }

            if (tokenData.isRugged) {
                analysisText += `• 🚨 RUG PULL WARNING: This token has been flagged as potentially rugged!\n`;
            }

            if (source !== "telegram" && topPercentHolders.length > 3) {
                analysisText += `👥 Top Holders: ${formatPercentages(
                    topPercentHolders
                )}\n`;
            }

            if (source === "telegram" && metrics.length > 0) {
                analysisText += `\nKey Observations:\n${metrics
                    .map((m) => `• ${m}`)
                    .join("\n")}\n`;
                if (tokenData.social?.telegram || tokenData.social?.twitter) {
                    analysisText += `\nSocial Links:\n`;
                    if (tokenData.social.telegram) {
                        analysisText += `• Telegram: ${tokenData.social.telegram}\n`;
                    }
                    if (tokenData.social.twitter) {
                        analysisText += `• Twitter: ${tokenData.social.twitter}\n`;
                    }
                }
            }

            if (tokenData.topWallets && tokenData.topWallets.length > 0) {
                // Show 5 wallets for telegram, 1 for other sources
                const walletsToShow = source === "telegram" ? 5 : 1;

                if (source === "telegram") {
                    analysisText += `\n📊 Top Wallets Trading This Token:\n`;
                    tokenData.topWallets
                        .slice(0, walletsToShow)
                        .forEach((wallet, index) => {
                            const medal = getMedalEmoji(index);
                            const name = formatWalletName(wallet);

                            analysisText += `${medal} ${name}\n`;
                            analysisText += `   • Win Rate: ${wallet.winrate}%\n`;

                            if (wallet.historic30d) {
                                const pnl = wallet.historic30d.realizedPnl;
                                const change =
                                    wallet.historic30d.percentageChange;
                                const changeIcon = change >= 0 ? "📈" : "📉";
                                analysisText += `   • 30d PnL: ${pnl}\n`;
                                analysisText += `   • 30d Change: ${changeIcon} ${change.toFixed(
                                    1
                                )}%\n`;
                            }
                            analysisText += "\n";
                        });
                } else {
                    const topWallet = tokenData.topWallets[0];
                    const name = formatWalletName(topWallet);

                    analysisText += `💹 Top Wallet: ${name} (${topWallet.winrate}% WR)`;
                    if (topWallet.historic30d) {
                        const change = topWallet.historic30d.percentageChange;
                        const changeIcon = change >= 0 ? "📈" : "📉";
                        analysisText += ` ${changeIcon} ${change.toFixed(1)}%`;
                    }
                    analysisText += "\n";
                }
            }

            analysisText += "\nAI ANALYSIS\n";

            analysisText += `\n\n${await generateAIAnalysis(
                tokenData,
                state,
                runtime
            )}\n`;

            analysisText += `\n🔍 View more top wallets: https://www.topwallets.ai/solana/token/${address}\n`;
            analysisText += `\n🔍 View detailed chart: ${chartUrl}`;

            await callback({
                text: analysisText,
            });

            return true;
        } catch (error) {
            elizaLogger.error("Token scan error", {
                error,
                address,
                errorMessage: isAxiosError(error)
                    ? error.response?.data?.message || error.message
                    : error instanceof Error
                      ? error.message
                      : "Unknown error",
                isAxiosError: isAxiosError(error),
            });

            const errorMessage = isAxiosError(error)
                ? `Failed to scan token: ${
                      error.response?.data?.message || error.message
                  }`
                : "An unexpected error occurred while scanning the token.";

            console.log(error);

            if (source === "telegram") {
                await callback({
                    text: errorMessage,
                });
            }

            return true;
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Can you analyze this token: 97RggLo3zV5kFGYW4yoQTxr4Xkz4Vg2WPHzNYXXWpump",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "I'll analyze that token for you. Here's what I found...",
                    action: "SCAN_TOKEN",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "What's do you think about this token: 97RggLo3zV5kFGYW4yoQTxr4Xkz4Vg2WPHzNYXXWpump",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Let me check the token information for you...",
                    action: "SCAN_TOKEN",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "what's your thoughts on 79yTpy8uwmAkrdgZdq6ZSBTvxKsgPrNqTLvYQBh1pump?",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "I'll analyze this token and share my findings with you...",
                    action: "SCAN_TOKEN",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "79yTpy8uwmAkrdgZdq6ZSBTvxKsgPrNqTLvYQBh1pump",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Let me look up the details of this token and give you my analysis...",
                    action: "SCAN_TOKEN",
                },
            },
        ],
    ],
};
