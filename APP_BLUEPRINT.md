# Poultry PMS Application Blueprint
**Source of Truth: Website & Desktop Parity Guide**

This document serves as the absolute reference for the Poultry PMS ecosystem. Any feature implemented on the Website must be reflected here first, and subsequently implemented on the Desktop application to maintain 1:1 parity.

---

## 1. General UI/UX Standards

### Navigation & Layout
- **Sidebar**: Persistent side navigation with role-based visibility.
- **Breadcrumbs**: Standard header navigation indicating current path (e.g., Dashboard > Flocks > Detail).
- **Theme**: Premium Dark Mode using Glassmorphism (semi-transparent backdrops, borders with low opacity).

### Worker Attribution (Worker Stamp)
- **Visual**: A 24x24px circle avatar with user initials.
- **Colors**: Emerald theme (`bg-emerald-500/10`, `text-emerald-400`).
- **Interaction**: Hover tooltip displaying "Full Name" and "Role" (e.g., OWNER, MANAGER, STAFF).
- **Placement**: Standardized in the "Actions" or "Attribution" column of every data table.

### Data Table Standards
- **Design**: Striped or bordered rows with hover highlight effects.
- **Action Columns**: Located on the far right, containing Edit/Delete/View buttons and the Worker Stamp.
- **Cleaning**: **STRICT PROHIBITION** of the "Growth Benchmark" column. All batch performance must be measured against dynamic targets, not static benchmarks.
- **Pagination**: Mandatory for lists exceeding 25 items.

---

## 2. Authentication & Multi-Tenancy

### Identity Bridge (Legacy ID)
- **Architecture**: The system uses a "Legacy ID" (string) stored in the `userId` or `user_id` column.
- **Mapping**: On the Website (Supabase), this maps to the `User.id`. On Desktop (SQLite), this maps to the local User record.
- **Consistency**: Business logic must always reference this ID to ensure data ownership persists across syncs.

### Farm Isolation
- **Rule**: Every database query **MUST** include a `farmId` or `farm_id` filter.
- **Context**: The `activeFarmId` is retrieved from the session context.
- **Security**: Cross-farm data access is a critical failure.

### Role-Based Access Control (RBAC)
- **OWNER**: Full access to all modules, settings, and data restoration.
- **MANAGER**: Full access to operational modules and logs, but cannot delete the farm or change the Owner.
- **WORKER/STAFF**: Access to Daily Records and Batch view only. No access to Finance or Admin Logs.

### Session Tracking & Device Identification
- **Web**: Standard Next.js website login.
- **Desktop**: Flutter Desktop App (Windows/macOS).
- **Mobile**: Flutter Mobile App (Android/iOS).
- **Labels**: `Web`, `Desktop`, `Windows`, `macOS`, `Android`, `iOS`.

---

## 3. Module Breakdown

### Livestock & Batches
- **Lifecycle**: `active` (Current flocks) -> `completed` (Sold/Processed) -> `archived` (Historical).
- **Tracking**: Initial Count, Current Count (Initial - Mortality), Breed Type, House Assignment.
- **Performance**: Automated calculation of Feed Conversion Ratio (FCR) and Mortality rate.
- **Zero-Floor Logic (STRICT)**: 
    - **Rule**: Total Mortality must always be $\le$ Initial Quantity. 
    - **Database**: Enforced by the `check_mortality_limit()` PostgreSQL trigger.
    - **UI**: Real-time validation in entry forms prevents input > current remaining count.

### Health & Isolation (The Infirmary)
- **Status Toggle**: Health events are logged as either `SICK` or `DEAD`.
- **Isolation Logic**:
    - `SICK`: Birds are transferred from `currentCount` to `isolationCount` and assigned to an **Isolation Room**.
    - `DEAD`: Birds are permanently removed from `currentCount` and logged in the `Mortality` table.
- **The Recovery Loop**:
    - **Return to Flock**: Decrements `isolationCount` and increments `currentCount`.
    - **Mortality in Isolation**: Decrements `isolationCount` and creates a `DEAD` log in `Mortality`. Does **NOT** affect `currentCount` (prevents double-counting).
- **Infrastructure**: "Isolation Rooms" are specialized housing units created within the Health module to track quarantined livestock.


### Commercial Hub
- **Sales**: Direct sale of livestock or eggs.
- **Customers**: Tagging sales to specific customers for balance tracking.
- **Orders**: History of all transactions with line-item detail.

### Finance Hub
- **Revenue**: Aggregated from Sales modules.
- **Expenses**: Categorized (Feed, Meds, Salary, Utilities, etc.) and linked to specific batches where applicable.
- **Health**: Net profit calculation per farm and per batch.

### Inventory Management
- **Items**: Feed, Medications, Equipment.
- **Logic**: Stock levels are automatically decremented by Feeding Logs.
- **Alerts**: Highlight items where `stockLevel <= reorderLevel`.

### Daily Records
- **Feeding Logs**: Captures `amountConsumed` and links to an Inventory item (Feed Type).
- **Weight Records**: Regular sampling of batch weights to track growth curves.

### Comparative Analytics Suite
- **Visual Style**: High-end **Glassmorphism** theme with gradients and interactive blurs.
- **Features**:
    - **Multivariate Selection**: Compare 2+ batches side-by-side.
    - **Ghost Curves**: Toggle "Industry Benchmarks" to see ghost-comparison overlays of ideal performance.
    - **Performance Scoring**: Automatic calculation of **EPEF (European Production Efficiency Factor)**.
    - **Metric Focus**: Comparative analysis of FCR, Mortality Rate, and Production Index.

---

## 4. Data Integrity & Logging (The Audit System)

### Audit Logic (PostgreSQL/SQLite)
- **Insert Logs**: Captured via database triggers. Records who created which entity and when.
- **Delete Logs (The "Vault")**:
    - Captured via `BEFORE DELETE` triggers.
    - **Data Format**: `|`-delimited CSV string. 
        - Row 1: Column Headers (e.g., `id|batchName|farmId`)
        - Row 2: Values (e.g., `123|Batch-Alpha|1`)
    - **Reliability**: Keys are sorted alphabetically to ensure deterministic parsing.
- **Data Restoration**:
    - **One-Click Restore**: Uses the `restore_deleted_record(log_id)` PostgreSQL function.
    - **Mechanism**: Parses the CSV header/value rows, dynamically builds an `INSERT` statement, and handles collisions with `ON CONFLICT (id) DO NOTHING`.

### Sync Methodology
- **UI Key**: **Batch Numbers** (e.g., BATCH-001) are the primary key for user-facing interactions.
- **System Key**: **UUIDs** (PostgreSQL) and **Auto-increment IDs** (SQLite) are mapped during the sync process.
- **Mapping Logic**: The Sync service uses a lookup table to match local SQLite IDs to remote Cloud UUIDs to prevent duplication.

---

## 5. Desktop Parity Checklist (Immediate To-Do)

- [ ] **Worker Stamp**: Implement the UI component and tooltip in Flutter.
- [ ] **Audit Logging**: Implement SQLite triggers for `insert_logs` and `delete_logs`.
- [ ] **CSV Restoration**: Build the Dart logic to parse `|`-delimited strings for data recovery.
- [ ] **Farm Context**: Ensure all SQLite `SELECT` queries include `farmId` filtering.
- [ ] **RBAC Enforcement**: Update UI visibility based on the `Role` enum.
- [ ] **Clean-up**: Remove "Growth Benchmark" from all Flutter list views.

---
**Document Version**: 1.0.0
**Last Updated**: 2026-05-14
**Status**: ACTIVE
