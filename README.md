# Community Wallet

A rules-based group wallet system that allows communities, alumni groups, and associations to collect funds, track contributions, and approve withdrawals transparently.

---

## Overview

**Community Wallet** combines the simplicity of a digital wallet with the connectivity of a social network.  
Users can create **virtual accounts** for purposes such as:
- Crowdfunding campaigns  
- Alumni dues and reunions  
- Community projects or charity drives  

Contributors can fund these virtual accounts easily while staying updated on progress, transactions, and goals — creating **trust and transparency** within every community.

---

## MVP Scope (Phase 1)

The first version of Community Wallet will focus only on three core user flows:

1️⃣ **Create Group & Invite Members**  
- Roles: Owner, Treasurer, Member  
- Set group rules (default templates only)

2️⃣ **Contribute to Group Wallet**  
- Each group gets a virtual account (mock/sandbox for MVP)  
- Members can make deposits  
- Balance updates in real time

3️⃣ **Withdrawal with Approval**  
- Treasurer or Owner requests withdrawal  
- Officers (not all members) approve  
- Payout triggered after required approvals  
- Notifications for each step

---

## Documentation Index

| File | Description |
|------|--------------|
| [`01_product_overview.md`](./docs/01_product_overview.md) | Business concept, goals, and vision. |
| [`02_mvp_user_flows.md`](./docs/02_mvp_user_flows.md) | Step-by-step flows for user actions. |
| [`03_technical_architecture.md`](./docs/03_technical_architecture.md) | System design and technology stack. |
| [`04_data_models.md`](./docs/04_data_models.md) | Database structure and entity relationships. |

---

## Tech Stack

### **Frontend (Mobile)**
- Next.JS (React Typescript)
- React useState for state management  
- Cookie and session handling for secure Storage and token management  
- REST API integration  

### **Backend**
- Node.js + Express  
- PostgreSQL  
- JWT authentication  
- Payment API integrations (Flutterwave)  
- Firebase Cloud Messaging (notifications)  

### **Infrastructure**
- Cloudinary / AWS S3 (media storage)

---

## Environment Variables



All sensitive keys and credentials are managed via an `.env` file.  
To set up your environment, copy `.env.example` into a new `.env` file:

```bash
cp .env.example .env
