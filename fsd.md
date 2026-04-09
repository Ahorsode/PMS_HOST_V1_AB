# Functional Specification Document: Poultry-PMS Agri-ERP

**Version:** 1.1 (Operational Expansion)  
**Status:** Source of Truth for Flutter Desktop Migration & Cloud ERP  
**Core Objective:** 100% Feature Parity & High-Visibility Operational Control

---

## 1. User Roles & Permissions Matrix

### 1.1 Core Roles & Polymorphic Dashboard Rules
The interface adapts dynamically based on the user's role to ensure data density and security.

| Role | Dashboard Identity | Rendering Logic |
| :--- | :--- | :--- |
| **OWNER / MANAGER** | **Executive Command** | **Comprehensive View**: Strategic KPIs (Gross Profit, Global FCR, Total Debt Exposure). Includes high-level charts and livestock snapshots. |
| **ACCOUNTANT** | **Financial Terminal** | **Exclusive View**: Cash Flow velocity, Receivables/Payables, Expense burn rate. **Restricted**: Mortality and feeding logs are hidden. |
| **WORKER** | **Operational Hub** | **Exclusive View**: Task-first layout (Log Feed, Eggs, Mortality). **Restricted**: All financial figures (revenue, price, total costs) are hidden. |

---

## 2. Core Business Workflows

### 2.1 Livestock & Production Logic
1.  **Isolation Management**:
    - **Concept**: Moving birds to an "Isolation House" for medical care or quarantine.
    - **Logic**: Deducts count from the `Active House` but **preserves** the `Livestock.currentCount`. 
    - **Valuation**: Isolation birds are still considered viable assets until marked as deceased.
2.  **Daily Egg Collection**:
    - **Crate Math**: Users can log production by "Crates". Total eggs = `cratesCollected * FarmSettings.eggsPerCrate` (Default: 30).
    - **"Unsorted" Default**: All daily collections by Workers default to an "Unsorted" category.
3.  **Grading & Sorting**:
    - **Workflow**: Manager/Accountant sorts "Unsorted" stock into specific grades (Small, Medium, Large, Jumbo, Damaged).
    - **Inventory Sync**: Inventory increments/decrements are tied to the specific `EggCategory` selected.

### 2.2 Supplier CRM (Accounts Payable)
1.  **Supplier Registration**:
    - Fields: Name, Phone, Email, Address, **BalanceOwed**.
2.  **Debt Integration**:
    - When an **Expense** (Feed/Medication) is created and linked to a Supplier, the `balanceOwed` increments if not paid immediately.
    - **Credit Tracking**: Allows farm owners to see exactly how much they owe to specific vendors at any time.

### 2.3 Commercial Hub (CRM & Sales)
1.  **Sales Workflow**:
    - **FIFO Inventory (Eggs)**: Sales deduct stock from the oldest `EggProduction` records first.
    - **Customer Debt**: Increments `Customer.balanceOwed` for partial or credit payments.

---

## 3. Financial & Productivity Logic

### 3.1 Advanced Analytics
- **Batch Performance Benchmark**: Side-by-side comparison of FCR, Mortality, and EPEF across multiple batches.
- **Feed Conversion Ratio (FCR)**:  
  `FCR = Total Feed Consumed (kg) / (Current Bird Weight * Total Count)`
- **EPEF (European Poultry Efficiency Factor)**:  
  `((Livability % * Avg Weight kg) / (Age in days * FCR)) * 100`

---

## 4. UI & UX Aesthetics Standards
- **Outdoor Visibility**: High-contrast glassmorphism (Opacity 0.4+ for cards).
- **Vivid Status Colors**: 
  - Emerald (#10b981) for Growth/Success.
  - Amber (#f59e0b) for Warnings/Tasks.
  - Rose (#e11d48) for Mortality/Loss.
