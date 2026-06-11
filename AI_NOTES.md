# PolyABC Platform — AI Notes & Project Memory
> **For any AI continuing this project:** Read this file first. It contains all business rules, architecture decisions, and session history. The human is Alfred, developer for Zeltzin's English school in Guadalajara, Mexico. Alfred tests from Tijuana. All class times are in Guadalajara timezone (America/Mexico_City, UTC-6).

---

## REPOS & INFRASTRUCTURE

- **Frontend:** `whitebear707/polyabc-site` → GitHub Pages
- **Backend:** `whitebear707/polyabc-server` → Render (Node.js/Express/Socket.io)
- **Database:** MongoDB Atlas
- **Email:** Resend API (`RESEND_API_KEY` env var on Render)
- **Server URL:** `https://polyabc-server.onrender.com`
- **Frontend URL:** `https://whitebear707.github.io/polyabc-site`

### Environment Variables (Render)
- `MONGO_URI` — MongoDB Atlas connection string
- `JWT_SECRET` — JWT signing secret
- `RESEND_API_KEY` — Resend email API key (added Session 5)

### Dependencies (package.json)
- express, socket.io, cors, mongodb, crypto
- bcryptjs — password hashing (added Session 5)
- jsonwebtoken — JWT tokens (added Session 5)
- node-fetch — HTTP requests for Resend API (added Session 5)

---

## FILES

### Frontend (polyabc-site)
- `index.html` — Main login page (teacher/student entry + Parent Panel button)
- `admin.html` — Admin panel (schedule, teachers, students, groups, payroll, attendance)
- `classroom.html` — Live classroom (WebRTC, whiteboard, tools)
- `greeting.html` — Teacher greeting page (speed test, enter class, waiting notification)
- `student-greeting.html` — Student greeting page (speed test, schedule, enter class)
- `schedule.html` — Teacher schedule page (availability, calendar, pay period header)
- `exam.html` — Placement test page
- `parent.html` — Parent panel (NEW Session 5)
- `sw.js` — Service worker (PWA, same-origin caching only)
- `manifest.json` — PWA manifest

### Backend (polyabc-server)
- `server.js` — All endpoints and socket.io logic (~1750 lines)
- `package.json` — Dependencies

### MongoDB Collections
- `rooms` — Teacher accounts (room, teacherName, password, hourlyRate, students[])
- `students` — Standalone student accounts (name, password, paid, debtMins, parentEmail...)
- `groups` — Group accounts (name, students[], debtMins)
- `assignments` — Scheduled classes (room, date, time, classType, groupId, sessionId...)
- `attendance` — Class records (all timestamps, disconnects, students[], network tests...)
- `config` — Admin password and settings
- `parents` — Parent accounts (NEW Session 5)
- `reg_codes` — Registration codes for parent panel (NEW Session 5)

---

## BUSINESS RULES

### Teacher Pay
- Base rate: $200 MXN/hr (stored as `hourlyRate` on room record)
- 1v1 class: base pay only
- Group class: base pay + **$20 MXN per student above 2 who actually showed up**
  - 2 students = $0 bonus, 3 = +$20, 4 = +$40, 5 = +$60, 6 = +$80
  - Bonus based on `studentsShowed`, not expected students
- **Teacher no-show rule:** If teacher was physically present < 15 minutes total → $0 pay
  - Presence = (classEndedAt - teacherOpenedAt) - totalDisconnectMins
  - The 10-minute reconnect window does NOT count as presence
- Student lateness/no-show does NOT affect teacher pay
- Student no-show (0 students): teacher gets 15-min consolation pay
- Group with some no-shows: teacher gets bonus only for students who showed

### Pay Periods
- Period 1: 30th of previous month → 14th of current month (paid on 15th)
- Period 2: 15th → 29th of current month (paid on 30th)
- Example: June 4 → showing May 30 – Jun 14

### Payroll Deductions
- Always deduct: `lateMins` + `disconnectMins` from paid minutes
- `paidMins = durationMins - lateMins - disconnectMins`
- Deductions apply regardless of endType (COMPLETED or not)
- Teacher gets paid for debt payoff minutes ON TOP of class pay (no cap)
- Debt payoff pay = `debtPayoffMins × (hourlyRate/60)`

### Debt System
- **Formula:** `updatedDebt = Math.max(0, oldDebt + minutesShort - payoffMins)` ← NET MATH, not two-step
- `minutesShort = lateMins + disconnectMins` (time teacher wasn't present)
- Debt tracked on: `group.debtMins` (group classes) or `student.debtMins` (1v1 classes)
- Trial classes: EXCLUDED from debt system entirely
- Debt payoff counter starts at scheduled class end time (NOT when teacher opened class)
- Counter counts full minutes only
- Cap: teacher can only pay back up to `minutesOwed`, no free extra pay
- Debt is permanent — stays until paid back in a future class
- `fix-student-debt` endpoint: resets and replays all debt from attendance records

### Attendance Rules
- Every assignment gets a unique `sessionId` when created by admin
- `sessionId` is the bulletproof key for all attendance lookups
- Teacher login stamps `teacherLoginAt` (first join only, never overwritten on reconnect)
- Teacher opening class stamps `teacherOpenedAt`
- Teacher closing class stamps `classEndedAt`
- Students stamp `joinedAt` on join, `leftAt` on leave or when teacher closes class
- Disconnect log: `disconnects[]` array with `disconnectedAt`, `reconnectedAt`, `gapMins`
- `totalDisconnectMins` = sum of all gap minutes
- Network test stamped on attendance for teacher and each student

### endType Rules
- `completed`: teacher present full duration with no unrecovered absences, OR absences fully paid back
- `ended_early`: teacher closed before scheduled end OR had disconnects/lateness not fully paid back
- `invalid_termination`: browser closed without clicking End Class (10-min timer fired)
- Once `classEndedAt` is stamped by `end-class` event, `invalid_termination` timer does NOT overwrite it
- `roomEndedCleanly` flag prevents disconnect handler from starting reconnect timer after End Class

### Student No-Show Pay
- 0 students show up → teacher gets 15-min consolation pay
- Teacher must wait at least 15 minutes before closing for no-show
- No-show pay = `(hourlyRate/60) × 15`

### Teacher No-Show
- Teacher present < 15 minutes → $0 pay, labeled `⛔ TEACHER NO-SHOW` in payroll
- Student/group owed full class duration

### Reconnect Window
- Teacher has 10 minutes to reconnect after disconnect
- After 10 min → `invalid_termination` fires
- (Proposed: increase to 15 min — not yet implemented)

### Ghost Records
- Attendance records with no matching assignment → skipped in payroll entirely
- Assignment lookup: by `sessionId` first, then by `date + scheduledTime`
- NO loose date-only fallback (causes ghost records to match wrong assignments)

### Trial Classes
- Duration: 15 minutes
- No debt tracking
- No group bonus
- Student is `isNewTrial: true` until admin processes them

---

## PARENT PANEL (Session 5)

### Flow
1. Admin clicks **Generate Code** → creates `REG-XXXXXX` code
2. Admin shares code with parent (WhatsApp, email, etc.)
3. Parent goes to `parent.html` → Register → enters code
4. Code validates → parent fills: relationship, name, phone, email, password
5. Parent fills student info: first name (auto-capitalized), DOB, full name, nickname
6. Submit → verification email sent via Resend
7. Parent confirms email → can log in
8. Parent sees student as "Pending Review"
9. Admin sees request in **📥 Requests** panel → Approve or Deny
10. If approved → student created in `students` collection with parent info attached
11. Admin checks **✅ Paid** checkbox when payment received
12. If unpaid → student login shows billing message

### Adding More Students
- Parent must have a NEW admin-generated code for each additional student
- Same parent account, multiple students supported
- Each student registration requires a unique unused code

### Paid/Unpaid
- `paid: false` → student login blocked with message: "Please contact billing / Por favor contacte a facturación"
- `paid: true` → normal login
- Admin toggles paid status in Students tab with checkbox
- Default for existing students (no paid field) → treated as paid

### Parent Dashboard
- Students tab: shows each student's name, paid status, enrollment status
- Attendance tab: shows all class records for all their students
- Clean view — no disconnect logs or technical details shown to parents

---

## CLASSROOM SYSTEM

### Session/Room Architecture
- Teacher room = permanent (created by admin, e.g. "freddy")
- `sessionId` = unique per assignment (created when admin schedules class)
- Classroom URL: `classroom.html?room=freddy&sessionId=abc123`
- `roomEndedCleanly` Set tracks intentional End Class to prevent phantom invalid_termination

### Student Slots (Session 5 Fix)
- Slots keyed by student **identity (name)**, not socketId
- `studentSlots[socketId] = identity` mapping
- `getIdentity(socketId)` helper for all DOM lookups
- DOM elements use identity as ID: `wrap-tito`, `slot-tito`, `vimg-tito`
- On reconnect: new socketId maps to same identity → existing slot found → NO CLONE
- `removeRemote()` checks if another active socketId maps to same identity before removing slot

### Network Test (Greeting Pages)
- Pings Cloudflare `1.1.1.1/cdn-cgi/trace` — 50 pings
- Measures: avgPing, jitter (max-min), packetLoss
- Thresholds: 🟢 ping<50ms jitter<50ms 0% loss | 🟡 ping<120ms jitter<100ms ≤3% loss | 🔴 worse
- Results stamped on attendance record
- Cached in localStorage by sessionId — reconnects skip test
- Teacher: `POST /attendance/network-test`
- Student: `POST /attendance/network-test/student`
- Speed test only enabled within 20-min class window

### Debt Counter in Classroom
- Shows after scheduled class end time
- Counts up: `🏅 +2:00 paying debt (2/5 min)`
- Uses `window._minutesOwed` (prev debt) + `window._totalDisconnectMins` (this class)
- `disconnect-total-update` socket event updates `_totalDisconnectMins` on reconnect
- `debt-payoff-update` emitted every full minute past class end → stamped on attendance immediately
- This ensures debt payoff is saved even if browser closes before End Class

---

## KNOWN BUGS & OUTSTANDING ISSUES

### Partially Working
- Debt counter visibility: sometimes doesn't show in classroom if `_totalDisconnectMins` not set before class end
- Student network test badge in attendance: shows ping/jitter but stamped via student greeting page only

### Not Yet Implemented
- 15-min reconnect window (currently 10 min) — Alfred requested, not done yet
- Double-confirm before closing class — Alfred requested, not done yet
- No-delete on closed classes — Alfred requested, not done yet
- Security hardening (bcrypt passwords for teachers, rate limiting, CORS restriction)
- Off2Class lesson capture tool (screenshots + audio → PolyABC lesson library)
- Electron desktop app (discussed but not started)

### Calendar
- Past dates are now blocked from assignment (fixed Session 5)
- 24hr bypass only bypasses advance-notice rule, not past-date rule

---

## CRITICAL BUG FIXES (Session 5)

### parent.html — validateCode Missing async Keyword
- **Problem:** Entire parent.html JS failed to parse — `doLogin`, `doRegister` and all other functions undefined
- **Root cause:** `validateCode()` used `await fetch(...)` but was declared as a regular `function` not `async function` — JS parse error stops execution of entire script block
- **Symptom:** Console showed `await is only valid in async functions` at line 370, then `doLogin is not defined`
- **Fix:** Changed `function validateCode()` to `async function validateCode()`
- **Prevention:** Always scan for non-async functions using await before pushing frontend JS

### classEndedAt Not Stamping
- **Problem:** Attendance showed Opened Class but blank Closed Class
- **Root cause:** In `end-class` handler, `lateMins` and `totalDisconnectMins` were used in `endType` calculation BEFORE they were declared → ReferenceError → handler crashed silently before `classEndedAt` stamp
- **Fix:** Moved `attRec`, `totalDisconnectMins`, `lateMins` declarations above `endType` calculation
- **Also fixed:** Teacher now sends `SESSION_ID` with `end-class` emit for reliable lookup after reconnects

### Invalid Termination After Clean End Class
- **Problem:** Teacher clicked End Class but attendance showed INVALID TERMINATION
- **Root cause:** When teacher calls `socket.disconnect()` after `end-class`, server's disconnect handler fired and started the 10-min reconnect timer, which then fired and overwrote `endType`
- **Fix:** `roomEndedCleanly` Set — when `end-class` fires, room is added to set. Disconnect handler checks set and skips reconnect timer entirely if room is in it.

### Group Bonus Not Applying
- **Problem:** Group class with 3 students paying $100 instead of $120
- **Root cause:** Debt payoff recalculation at end of payroll block was overwriting `classPay` (including group bonus) with just `hourlyRate/60 × totalPaidMins`
- **Fix:** `groupBonus = is1v1 ? 0 : Math.max(0, studentsShowed - 2) × 20` always added after time-based pay

### Debt Math Wrong (Two-Step vs Net)
- **Problem:** `updatedDebt = Math.max(0, oldDebt - payoffMins) + minutesShort` gave wrong results
- **Example:** oldDebt=0, missed=7, payoff=6 → wrong: 7, correct: 1
- **Fix:** `updatedDebt = Math.max(0, oldDebt + minutesShort - payoffMins)` — net math in ONE step
- Applied to: group debt, 1v1 rooms collection, 1v1 standalone students, invalid_termination handler

### totalDisconnectMins Not Updated on Invalid Termination
- **Problem:** Disconnect log showed correct gap but totalDisconnectMins was 0 → payroll calculated wrong
- **Fix:** `invalid_termination` timeout now reads and updates `totalDisconnectMins` including the 10-min gap

---

## DEVELOPER PANEL

- Hidden button: bottom-right of admin calendar legend (faint gray square, opacity 0.3)
- Password: `polydev2026`
- Allows manual creation of attendance records
- All manual records flagged with `manualEntry: true` and `🛠️ MANUAL ENTRY` badge
- Fields: room, date, time, classType, groupName, status, timestamps, students, disconnect mins

---

## ADMIN PANEL ENDPOINTS REFERENCE

| Endpoint | Method | Description |
|---|---|---|
| `/payroll` | GET | Calculate payroll (params: from, to, room) |
| `/attendance` | GET | Teacher's own attendance records |
| `/attendance/:roomId` | GET | All attendance for a room |
| `/admin/manual-attendance` | POST | Create manual attendance record |
| `/admin/fix-endtypes` | POST | Fix wrong endType on existing records |
| `/admin/fix-student-debt` | POST | Reset and replay all student/group debt |
| `/admin/reg-code` | POST | Generate parent registration code |
| `/admin/reg-codes` | GET | List all registration codes |
| `/admin/student-requests` | GET | Pending student registration requests |
| `/admin/student-request/:action` | POST | Approve or deny student request |
| `/admin/student-paid` | POST | Toggle student paid status |
| `/waiting-count/:room` | GET | Count students waiting in room |
| `/groups/:id/debt` | GET | Get group debt minutes |
| `/student-debt` | GET | Get 1v1 student debt (params: room, name) |

---

## IMPORTANT TECHNICAL NOTES

- All times stored as Guadalajara (America/Mexico_City) — never browser local time
- `todayGDL()` on server returns YYYY-MM-DD in GDL timezone
- `nowGDL()` on client uses `Intl.DateTimeFormat.formatToParts()` — timezone safe
- Student schedule (student-greeting.html) is the ONLY place browser local timezone is used
- Midnight crossover fix in timer: `if (elapsed < -720) elapsed += 1440`
- `attKeyAsync(room, sessionId)` — async function to get attendance query key
- `getTokenFromReq(req)` — extracts and verifies JWT from Authorization header
- Teacher token role: `teacher`, Admin token role: `admin`, Parent token role: `parent`

