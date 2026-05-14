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

---

## 3. Module Breakdown

### Livestock & Batches
- **Lifecycle**: `active` (Current flocks) -> `completed` (Sold/Processed) -> `archived` (Historical).
- **Tracking**: Initial Count, Current Count (Initial - Mortality), Breed Type, House Assignment.
- **Performance**: Automated calculation of Feed Conversion Ratio (FCR) and Mortality rate.

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

---

## 4. Data Integrity & Logging (The Audit System)

### Audit Logic (PostgreSQL/SQLite)
- **Insert Logs**: Captured via database triggers. Records who created which entity and when.
- **Delete Logs (The "Vault")**:
    - Captured via `BEFORE DELETE` triggers.
    - Data Format: `|`-delimited CSV string including headers as the first row.
    - Reliability: Ordered by `key` to ensure deterministic parsing.
- **Data Restoration**:
    - **One-Click Restore**: Admin logic that parses the Delete Log CSV, strips identifiers, and re-inserts the record while maintaining original farm/user context.

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
