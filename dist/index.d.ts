import { Action, Provider, Plugin } from '@ai16z/eliza';

declare const scanWalletAction: Action;

declare const index$1_scanWalletAction: typeof scanWalletAction;
declare namespace index$1 {
  export { index$1_scanWalletAction as scanWalletAction };
}

declare const trendingTokensProvider: Provider;

declare const index_trendingTokensProvider: typeof trendingTokensProvider;
declare namespace index {
  export { index_trendingTokensProvider as trendingTokensProvider };
}

declare const topwalletsPlugin: Plugin;

export { index$1 as actions, index as providers, topwalletsPlugin };
