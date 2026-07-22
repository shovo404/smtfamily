# Role-based Feature Expansion Plan

This is a large scope. Ranking the work into phases so we ship value fast and don't blow the turn budget on one giant edit. Confirm which phase(s) to build now.

## Current state
- Roles: `super_admin`, `admin`, `hr`, `sr`, `dsr`, `fso`
- Tables: `profiles`, `user_roles`, `tasks`, `attendance`, `ta_requests`, `employee_locations`
- Pages: dashboard, employees, tasks, attendance, ta, profile

## Gap vs spec
- Missing role: **DHR** (view-only HR)
- Missing tables: notifications, activity_logs, company_settings, holidays, devices
- Missing UI: Live Tracking map, Reports (PDF/Excel export), Notifications center, Settings, Password reset, Suspend/activate, Change role
- Permission matrix not fully enforced (e.g. HR can't delete, DHR is view-only, admin can't touch super_admin)

## Proposed phases

### Phase 1 — Core permissions + missing role (small)
- Add `dhr` to `app_role` enum
- Permission helpers: `canManageEmployees`, `canDelete`, `canApproveTA`, `canEditSettings`, `isViewOnly`
- Enforce in UI: hide/disable buttons per matrix; protect super_admin row (only super_admin can edit/delete another super_admin)
- Employees page: add Suspend/Activate toggle (already has `status`), Change Role dropdown, Reset Password action (admin API)
- Dashboard: add Absent Today, Late Today, On Leave, Live count widgets

### Phase 2 — Notifications
- `notifications` table (recipient_id nullable = broadcast, title, body, type, read_at)
- Realtime subscription for bell icon in top bar with unread badge
- Admin "Send Notification" page (target: user / role / broadcast)
- Auto notifications: TA approved/rejected, task assigned, GPS off alert

### Phase 3 — Live Tracking
- Employee browser sends location every N sec while checked-in (upsert to `employee_locations`)
- Admin `/live` page with Leaflet map + marker per employee, last-seen, online/offline (< 5 min = online)
- Route history for a day (polyline from location samples)

### Phase 4 — Reports & Export
- `/reports` page: date range + role filter
- Daily / Weekly / Monthly attendance summary
- Export to CSV (client) + PDF (jsPDF) + Excel (xlsx)

### Phase 5 — Settings & meta
- `company_settings` (name, working hours, office lat/lng, attendance radius, face verify on/off)
- `holidays` table
- Attendance check-in validates against office radius + working hours
- Super admin only

## Technical details
- New enum value via migration: `ALTER TYPE app_role ADD VALUE 'dhr';`
- New tables get RLS + GRANT following project pattern
- Password reset / suspend uses `supabaseAdmin` inside authorized server fn
- Realtime enabled on `notifications` and `employee_locations`
- Map lib: Leaflet (OSM tiles, no API key). Reports: jsPDF + SheetJS
- Bengali labels retained in UI

## What I need from you
Pick one:
- **A)** Ship Phase 1 now (permissions + DHR + employee actions + dashboard widgets). Recommended first step.
- **B)** Phase 1 + 2 (adds notifications)
- **C)** All 5 phases in sequence (multiple turns, larger changes)
- **D)** Different order / skip something — tell me which

Also confirm:
- Live tracking uses **browser geolocation while app is open** only (no true background — web limitation we discussed earlier). OK?
- Face verification stays as **photo capture proof**, not actual face matching? (Real face-match needs face-api.js + enrollment flow — can add in a later phase if you want.)