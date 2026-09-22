require('dotenv').config();
const { ethers } = require('ethers');
const ccxt = require('ccxt');

// --- 1. Setup Telegram ---
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

async function sendTelegramAlert(message) {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    try {
        await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: message, parse_mode: 'Markdown' })
        });
    } catch (error) {
        console.error("Telegram alert failed:", error.message);
    }
}

// --- 2. Setup Blockchain Provider (Ethers v6) ---
const ARBITRUM_RPC = process.env.ARBITRUM_RPC;
const provider = new ethers.JsonRpcProvider(ARBITRUM_RPC, {
    chainId: 42161,
    name: 'arbitrum'
});

// --- 3. Setup Uniswap V3 Quoter ---
const USDC = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';
const UNISWAP_V3_QUOTER = '0x61fFE014bA17989E743c5F6cB21bF9697530B21e';
const V3_QUOTER_ABI = [
    "function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)"
];
const quoter = new ethers.Contract(UNISWAP_V3_QUOTER, V3_QUOTER_ABI, provider);

// --- 4. Watchlists ---
const WATCHLIST = [
    { name: "UNI/USD", address: "0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0", decimals: 18, cexSymbol: "UNI/USDT", dexFee: 3000, priceTarget: 10.00 },
    { name: "AAVE/USD", address: "0xba5DdD1f9d7F570dc94a51479a000E3BCE967196", decimals: 18, cexSymbol: "AAVE/USDT", dexFee: 3000, priceTarget: 150.00 }
];

const STABLE_WATCHLIST = [
  
    { name: "USDT", address: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", decimals: 6, target: 1.00 },
    { name: "DAI",  address: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1", decimals: 18, target: 1.00 }
];

// --- 5. Helpers ---
async function getCEXPrice(symbol, exchangeId = 'coinbase') {
    const exchange = new ccxt[exchangeId]();
    try {
        const ticker = await exchange.fetchTicker(symbol);
        return ticker.last;
    } catch (e) {
        console.error(`CEX Error (${exchangeId} - ${symbol}):`, e.message);
        return null;
    }
}

async function getDEXPrice(tokenAddress, decimals, feeTier) {
    try {
        const amountIn = ethers.parseUnits("1.0", decimals); 
        const params = { tokenIn: tokenAddress, tokenOut: USDC, amountIn: amountIn, fee: feeTier, sqrtPriceLimitX96: 0 };
        const result = await quoter.quoteExactInputSingle.staticCall(params);
        return parseFloat(ethers.formatUnits(result[0], 6)); 
    } catch (e) {
        console.log(`DEX Error for ${tokenAddress}:`, e.message);
        return null;
    }
}

// --- 6. Main Logic Functions ---
async function checkPrices() {
    console.log(`\n--- Checking Price Targets & CEX Spreads ---`);
    for (const token of WATCHLIST) {
        const cexPrice = await getCEXPrice(token.cexSymbol, 'bybit');
        const dexPrice = await getDEXPrice(token.address, token.decimals, token.dexFee);
        if (cexPrice && dexPrice) {
            console.log(`${token.name} | Bybit: $${cexPrice.toFixed(2)} | Uniswap V3: $${dexPrice.toFixed(2)}`);

            // Absolute Price Target Alert
            if (cexPrice >= token.priceTarget) {
                const msg = `🎯 **Absolute Price Target Hit!**\n**Asset:** ${token.name}\n**Target:** $${token.priceTarget.toFixed(2)}\n**Current (Bybit):** $${cexPrice.toFixed(2)}`;
                await sendTelegramAlert(msg);
            }

            // CEX vs DEX Spread Alert
            const spread = ((cexPrice - dexPrice) / dexPrice) * 100;
            if (Math.abs(spread) > 0.5) {
                const direction = spread > 0 ? "CEX higher" : "DEX higher";
                const msg = `🚨 **CEX/DEX Spread Alert!**\n**Asset:** ${token.cexSymbol}/USDT\n**Bybit:** $${cexPrice.toFixed(2)}\n**Uniswap V3:** $${dexPrice.toFixed(2)}\n**Spread:** ${spread.toFixed(2)}% (${direction})`;
               await sendTelegramAlert(msg);
            }
        }
    }
}

async function checkStablecoinPegs() {
    console.log(`\n--- Checking Stablecoin Pegs ---`);
    for (const stable of STABLE_WATCHLIST) {
        // Stablecoins use the 0.01% (100) fee tier on Uniswap V3
        const price = await getDEXPrice(stable.address, stable.decimals, 100); 
        if (price) {
            const deviation = ((price - stable.target) / stable.target) * 100;
            console.log(`${stable.name} | Price: $${price.toFixed(4)} | Deviation: ${deviation.toFixed(2)}%`);

            if (Math.abs(deviation) > 0.5) {
                const direction = deviation > 0 ? "ABOVE peg" : "BELOW peg";
                const msg = `🚨 **STABLECOIN DEPEG ALERT!** 🚨\n**Asset:** ${stable.name}\n**Current Price:** $${price.toFixed(4)}\n**Deviation:** ${deviation.toFixed(2)}% (${direction})`;
                await sendTelegramAlert(msg);
            }
        }
    }
}

// --- 7. Execution Loop ---
async function main() {
    const startupMsg = `🤖 **Price Alert Bot Started!**\n**Monitoring:** UNI, AAVE, Stablecoins\n**Features:** Targets, CEX Spreads, Depeg Alerts\n**Interval:** Every 2 hours`;
    await sendTelegramAlert(startupMsg);

    await checkPrices();
    await checkStablecoinPegs();

    setInterval(async () => {
        await checkPrices();
        await checkStablecoinPegs();
    }, 7200000); // 2 hours
}

main().catch(console.error);
