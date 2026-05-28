# HatchLog Desktop Manual Activation (Flutter)

Use this in the Flutter desktop app where the local SQLite `farm_id` and Windows `systemGUID` are available.

## 1) Activation Package UI

- Show combined activation package:
  - `FARM_ID=<local farm_id>`
  - `HARDWARE_ID=<systemGUID>`
- Add **Copy Activation Package** button to copy the full block.

## 2) Deterministic Token Validation

- Token formula must match backend:
  - payload = `hatchlog-manual-v1:{HARDWARE_ID_NORMALIZED}:{FARM_ID_NORMALIZED}:{EXPIRY_ISO}`
  - digest = `HMAC_SHA256(payload, HATCHLOG_LICENSE_TOKEN_SECRET)`
  - readable body = first 16 base32-like chars using alphabet `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`, grouped in blocks of 4.
  - token = `HL-{durationDays}D-{groupedBody}`

Use `docs/flutter/manual_license_validator.dart` as the implementation source.

## 3) Persist Local Access

On successful validation, write to SQLite token config store:
- `activation_token`
- `hardware_id`
- `farm_id`
- `expires_at`
- `is_active=true`

Then permit dashboard entry.
