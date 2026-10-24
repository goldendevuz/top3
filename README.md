# Top3 — Curated Domain Directory & Auction Marketplace

[![Live Website](https://img.shields.io/badge/Live-top3.uz-10b981.svg)](https://top3.uz)
[![License: MIT with Attribution](https://img.shields.io/badge/License-MIT%20with%20Attribution-blue.svg)](LICENSE)
[![Payments: inPAY](https://img.shields.io/badge/Payments-inPAY.uz-3b82f6.svg)](https://inpay.uz)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688.svg)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-61dafb.svg)](https://react.dev)

**Top3** ([top3.uz](https://top3.uz)) is a premier directory, pay-to-rank leaderboard, and bidding auction platform tailored for Uzbekistan web projects and `.uz` domains. It empowers startups, creators, and online businesses to secure prime visibility through real-time dynamic bidding, sponsored showcases, and transparent engagement metrics.

---

## 🌟 Key Features

- **Dynamic Leaderboards**:
  - **General Board (`umumiy`)**: All-time high-visibility ranking driven by cumulative community engagement and bidding positions.
  - **Daily Board (`bugun`)**: 24-hour auction cycle where domain owners compete for daily top placements.
  - **Open Directory (`ochiq`)**: Curated free directory categorized by industry (Tech, E-Commerce, Media, SaaS, Services).
- **Automated inPAY Payment Integration**:
  - Seamless UZS checkout powered by [inPAY](https://inpay.uz) with automated merchant authorization, webhook confirmations, and idempotent transactions.
- **Click Telemetry & Fraud Prevention**:
  - Anti-gaming click tracking using device fingerprinting, user agent verification, and IP deduplication to ensure genuine traffic reporting.
- **Google OAuth & Domain Management**:
  - One-click Google SSO login.
  - Custom domain dashboard: configure custom banners, call-to-action (CTA) buttons, custom URLs, and track live conversion rates.
- **Instant Telegram Alerts**:
  - Automated Telegram bot notifications for domain approvals, new outbids, and completed payment confirmations.
- **Dynamic SEO Engine**:
  - Built-in dynamic `/sitemap.xml`, `/robots.txt`, and structured metadata generation for maximum search engine crawlability.

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| **Backend** | Python 3.11, FastAPI, SQLAlchemy 2 (async), asyncpg, Alembic |
| **Database** | PostgreSQL 15 |
| **Frontend** | React 18, Vite, TypeScript, TailwindCSS, Zustand |
| **Payments** | [inPAY](https://inpay.uz) Hosted Checkout & Webhooks |
| **Notifications** | Telegram Bot API (`httpx`) |
| **Deployment** | Docker Compose, Nginx Reverse Proxy, Cloudflare Zero Trust Tunnel |

---

## 🚀 Quick Start

### 1. Clone & Configure
```bash
git clone https://github.com/goldendevuz/top3.git
cd top3
cp .env.example .env
# Edit .env with your PostgreSQL credentials, Google OAuth IDs, and inPAY keys
```

### 2. Run with Docker Compose
```bash
docker compose up -d --build
```

The application will be accessible at:
- **Frontend / Web UI**: `http://localhost:5173`
- **Backend API**: `http://localhost:8002` (or `http://localhost:5173/api/`)
- **Interactive Swagger Docs**: `http://localhost:8002/docs`

---

## 🔗 Official Links

- **Live Platform**: [https://top3.uz](https://top3.uz)
- **GitHub Repository**: [https://github.com/goldendevuz/top3](https://github.com/goldendevuz/top3)
- **Payment Provider**: [https://inpay.uz](https://inpay.uz)

---

## 📄 License & Attribution

This project is licensed under the **MIT License with Attribution** (see [`LICENSE`](LICENSE)).

You are free to use, modify, distribute, fork, and integrate this software for **any purpose** (commercial, personal, or educational), under the condition that the original author attribution and copyright notice (**Abdulmajid Yunus / [@goldendevuz](https://github.com/goldendevuz)**) are preserved and displayed in the `README.md` file of any copies, forks, or derivative works.
