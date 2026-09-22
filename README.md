# 🚀 Arbitrum Price & Depeg Alert Bot

A Node.js monitoring bot that tracks token prices and stablecoin pegs across both Centralized Exchanges (CEXs) and Decentralized Exchanges (DEXs) on the Arbitrum network. It sends real-time alerts directly to Telegram.

## ✨ Features

- **🎯 Absolute Price Targets:** Set custom target prices for tokens (e.g., Alert me if UNI hits $10).
- **📊 CEX vs. DEX Spread Monitoring:** Compares prices between CEXs (like Bybit/Coinbase) and Uniswap V3 on Arbitrum to detect arbitrage or market inefficiencies.
- **🚨 Stablecoin Depeg Alerts:** Monitors USDT and DAI against USDC on Uniswap V3. Alerts immediately if a stablecoin deviates by more than 0.5% from its $1.00 peg.
- **📉 Percentage Change Alerts:** Detects sudden price movements over a 2-hour window.
- **📱 Telegram Notifications:** Instant alerts delivered directly to your phone via Telegram Bot API.
- **📡 Mobile-First Architecture:** Designed to run seamlessly in Termux on Android devices using `tmux` for background execution.

## 🛠️ Tech Stack

- **Runtime:** Node.js
- **Blockchain Interaction:** Ethers.js v6
- **CEX Data:** CCXT (Cryptocurrency Exchange Trading Library)
- **DEX Data:** Uniswap V3 Quoter Contract (Arbitrum)
- **Notifications:** Telegram Bot API
- **Environment:** Termux (Android), tmux for session management

## 📦 Prerequisites

Before running the bot, you will need:
1. **Node.js** installed (v18+ recommended).
2. **Alchemy Account:** A free Arbitrum Mainnet RPC URL.
3. **Telegram Bot:** A bot token from `@BotFather` and your Chat ID from `@userinfobot`.

## 🚀 Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone git@github.com:superwavvy/price-alert-bot.git
   cd price-alert-bot
