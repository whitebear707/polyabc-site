# PolyABC — AI Collaboration Notes
> Last updated by: Claude (Anthropic) — Session 4
> Purpose: Shared memory for AI assistants working on this project. Read this FIRST before touching any code.

---

## 1. Project Overview

PolyABC is a **real-time online English school classroom platform** built for a school in Guadalajara, Mexico. It supports live teacher-student video/audio sessions, an interactive whiteboard, classroom tools (reactions, coin, dice, laser pointer, rewards), and an admin panel for scheduling, payroll, and student management.

**Owner:** Zeltzin (school owner/boss)  
**Developer:** Alfred (husband, primary technical contact)  
**Timezone:** ALL times are America/Mexico_City (Guadalajara). Never use UTC for business logic.

---

## 2. Architecture Overview

### Stack
| Layer | Technology | Host |
|---|---|---|
| Frontend | Vanilla HTML/CSS/JS + Fabric.js | GitHub Pages (`whitebear707.github.io/polyabc-site`) |
| Backend | Node.js + Express + Socket.io | Render (Starter paid tier — always on) |
| Database | MongoDB Atlas | Cloud |

### Key URLs
- Frontend: `https://whitebear707.github.io/polyabc-site/`
- Backend: `https://polyabc-server.onrender.com`
- GitHub token: stored in dev environment (do not commit)

### Frontend Pages
| File | Purpose |
|---|---|
| `index.html` | Login page (teacher + student) |
| `classroom.html` | Main classroom (whiteboard, video, tools) |
| `admin.html` | Admin panel (schedule, students, payroll, attendance) |
| `greeting.html` | Teacher waiting/greeting screen before class |
| `schedule.html` | Teacher's own schedule view |
| `exam.html` | Trial student placement test + calendar booking |

---

## 3. Authentication & Session Flow

### Teacher Login
1. Teacher enters room number + password on `index.html`
2. POST `/validate-room` → server checks `rooms` collection
3. On success: redirected to `greeting.html?room=X&name=Y`
4. Teacher can open class from greeting screen → redirected to `classroom.html`

### Student Login
1. Student enters name + password on `index.html`
2. POST `/validate-room` → server checks student list in room
3. **Room 101 is special**: trial students with an assigned booking can enter here
4. On success: redirected to `classroom.html?room=X&name=Y&role=student`

### Trial Student Flow
1. Trial student takes placement test on `exam.html`
2. Level detected → saved via POST `/trial/save-level`
3. Student books a time slot on the calendar
4. Admin assigns a teacher (room) to the booking
5. Trial student can now log into Room 101 with their trial password
6. Server's `/validate-room` checks `trial_bookings` collection for assigned status

### Trial Passwords
- Auto-generated: `try1` through `try20` (cycling)
- Counter stored in `config` collection (`key: 'trialPasswordCounter'`)
- Password field is greyed out/auto-filled in admin UI

### Admin Panel
- Accessed via `admin.html`
- No login — uses a simple password modal for destructive actions (reset)
- Admin password stored in `config` collection (`key: 'adminPassword'`, default: `admin1234`)

---

## 4. WebRTC Flow

### Overview
Peer-to-peer audio/video using WebRTC. Socket.io is used for signaling only.

### Connection Sequence
1. User joins room via socket (`join-room` event)
2. Server broadcasts `user-joined` to existing peers
3. New peer creates RTCPeerConnection for each existing peer
4. Offer/answer exchange via socket (`webrtc-offer`, `webrtc-answer`, `webrtc-ice-candidate`)
5. On ICE completion: media streams flow peer-to-peer

### Polite Peer Pattern
- Implemented to handle race conditions when two peers offer simultaneously
- Uses `makingOffer` flag and `ignoreOffer` logic with rollback
- **Do not simplify this** — removing it causes black screens and audio drops on reconnect

### Student-to-Student Video
- Students CAN see each other (enabled intentionally)
- `createVideoSlot()` does NOT skip student-role users on student side
- Was disabled in early versions — do not re-disable

### Reconnect Grace Period
- Teacher has a **5-minute grace period** after disconnect
- Students see a waiting screen during this period
- Timer managed server-side; room is not destroyed immediately

### Known WebRTC Fragile Areas
- Teacher cam shows black when student returns after disconnect (unresolved)
- Audio indicator always shows muted on student side (unresolved)
- Race conditions on simultaneous offers — polite peer pattern mitigates but doesn't fully eliminate

---

## 5. Classroom Lifecycle

```
Teacher opens greeting.html
    → clicks "Open Class" → room marked as opened (classOpenedAt logged)
    → redirected to classroom.html

Countdown timer runs (scheduled class time - now)
    → when timer hits 0: "class-started" socket event fires
    → classStartedAt logged in attendance

Class runs...

Teacher clicks "End Class"
    → endClass() called
    → attendance record closed (classEndedAt, endType: 'completed')
    → students redirected to goodbye screen
    → room reset for next class

If teacher closes browser mid-class:
    → disconnect handler fires after socket timeout
    → endType: 'invalid_termination' logged
    → students see reconnect waiting screen (5-min grace)
```

### Owed Timer
- If teacher joins AFTER scheduled start time, a second "owed" timer appears
- Shows how many minutes are owed to make up
- **Only triggers for teacher being late — NOT for student lateness**
- Do not change this logic without careful testing

---

## 6. Socket Events

### Client → Server
| Event | Emitter | Payload | Purpose |
|---|---|---|---|
| `join-room` | Teacher + Student | `{ room, name, role }` | Join socket room |
| `reaction` | Teacher | `{ room, emoji }` | Send emoji reaction |
| `show-result` | Teacher | `{ room, text, sub, type, extra }` | Coin/dice result |
| `laser-move` | Teacher | `{ room, x, y }` | Laser pointer position (ratio 0-1) |
| `give-star` | Teacher | `{ room, name, socketId, type, emoji }` | Give reward to student |
| `webrtc-offer` | Peer | `{ room, to, offer }` | WebRTC signaling |
| `webrtc-answer` | Peer | `{ room, to, answer }` | WebRTC signaling |
| `webrtc-ice-candidate` | Peer | `{ room, to, candidate }` | WebRTC signaling |
| `canvas-update` | Teacher + Student | `{ room, json }` | Whiteboard sync |
| `end-class` | Teacher | `{ room }` | End the class session |
| `class-opened` | Teacher | `{ room, time }` | Mark room as opened |
| `class-started` | Auto (timer) | `{ room }` | Mark class as officially started |

### Server → Client
| Event | Receiver | Payload | Purpose |
|---|---|---|---|
| `user-joined` | All in room | `{ socketId, name, role }` | New peer arrived |
| `user-left` | All in room | `{ socketId, name }` | Peer disconnected |
| `reaction` | All in room | `{ emoji }` | Show reaction animation |
| `show-result` | All in room | `{ text, sub, type, extra }` | Show coin/dice result |
| `laser-move` | Students | `{ x, y }` | Show laser dot |
| `star-given` | All in room | `{ name, emoji }` | Trigger reward celebration |
| `class-ended` | Students | `{}` | Redirect to goodbye |
| `teacher-disconnected` | Students | `{}` | Show waiting screen |

### ⚠️ Fragile Socket Areas
- `show-result` was previously looping infinitely: `showResultOnCanvas` was re-emitting the event. Fixed by splitting into `showResultOnCanvas` (display only) and `broadcastResult` (teacher-only emit). **Do not merge these back.**
- `laser-move` sends position as ratio (0–1) of window dimensions. Do not send pixel values — screen sizes differ between teacher and students.
- Canvas updates can cause feedback loops if both sides emit on every change. Current logic: only emit on local user interaction.

---

## 7. Database Collections

### `rooms`
```json
{
  "room": "10",
  "teacherName": "Alfred",
  "teacherPassword": "pass123",
  "hourlyRate": 150,
  "timeOverride": false,
  "students": [{ "name": "bobby", "password": "abc" }],
  "schedule": { "mon": ["10:00"], "tue": [] }
}
```
- `timeOverride`: bypasses 24hr trial booking limit for emergency bookings (checkbox in admin — save logic pending)

### `students`
```json
{
  "name": "Maria",
  "password": "try3",
  "room": "101",
  "classType": "trial",
  "trialLevel": "A2",
  "trialDate": "2024-06-01",
  "trialTime": "10:00",
  "isNewTrial": true
}
```
- `isNewTrial`: true when student just booked. Powers the glowing "🎓 New Trial!" button in admin. Cleared when admin views.

### `groups`
```json
{
  "name": "Beginners A",
  "level": "A1",
  "classType": "group",
  "students": ["Maria", "Juan"],
  "time": ""
}
```
- Max 6 students enforced in `addStudentToGroup()` — do not remove this check
- `time` field intentionally removed from groups (set per-assignment instead)

### `assignments`
```json
{
  "room": "10",
  "date": "2024-06-01",
  "time": "10:00",
  "level": "B1",
  "classType": "group",
  "students": ["Maria", "Juan"],
  "groupId": "abc123",
  "groupName": "Beginners A",
  "createdAt": "..."
}
```

### `attendance`
```json
{
  "room": "10",
  "date": "2024-06-01",
  "scheduledTime": "10:00",
  "teacherLoginAt": "...",
  "teacherOpenedAt": "...",
  "classStartedAt": "...",
  "classEndedAt": "...",
  "endType": "completed",
  "students": [{ "name": "bobby", "joinedAt": "...", "leftAt": "..." }]
}
```
- Records are per-class (room + date + scheduledTime) — NOT merged per day
- `endType`: `'completed'` | `'ended_early'` | `'invalid_termination'`
- `scheduledTime` is critical for payroll matching — attendance without it won't appear in payroll

### `trial_bookings`
```json
{
  "studentId": "abc",
  "studentName": "Maria",
  "level": "A2",
  "date": "2024-06-01",
  "time": "10:00",
  "status": "assigned",
  "room": "10",
  "createdAt": "..."
}
```
- `status`: `'pending'` | `'assigned'`
- Only `assigned` bookings allow trial student to enter Room 101

### `availability`
```json
{
  "room": "10",
  "dayHours": { "mon": ["09:00", "10:00"], "tue": [] },
  "dates": { "2024-06-01": ["10:00"] },
  "timezone": "America/Mexico_City"
}
```

### `config`
```json
[
  { "key": "adminPassword", "value": "admin1234" },
  { "key": "trialPasswordCounter", "value": 3 }
]
```
- `adminPassword`: used for reset modal. Set via `ADMIN_PASSWORD` env var on Render.
- **Reset wipes everything EXCEPT this config entry** — critical to preserve

---

## 8. Fragile & Dangerous Systems

### 🔴 Do NOT Remove
- **Polite peer pattern** in WebRTC (`makingOffer`, `ignoreOffer`, rollback) — removing causes black screens
- **`scheduledTime` in attendance** — payroll breaks without it
- **`todayGDL()` helper** — uses Mexico City timezone. Using `new Date().toISOString()` breaks evening classes (shifts to next UTC day)
- **Room 101 special handling** in `/validate-room` — trial flow depends on it
- **`roomScheduledTime[room]` map** on server — must be populated via `timer-info` emit before attendance ops work
- **`trialPasswordCounter` in config** — reset preserves this intentionally

### ⚠️ Timing-Sensitive Code
- Coin flip: result is determined client-side, broadcast immediately so teacher and student animate simultaneously. Do not move broadcast to after animation ends.
- Dice: same — broadcast on click, not on animation end
- `classStartedAt` logged when countdown hits exactly 0 — if timer logic changes, verify this still fires

### ⚠️ Known Hacks / Workarounds
- Confetti drawn directly on Fabric.js canvas context (not a DOM overlay) because DOM overlays wouldn't render on student side
- `canvas.renderAll()` called each frame to clear confetti — this re-renders all fabric objects each frame (expensive but necessary)
- Emoji reactions use CSS `animation: floatUp` — previous attempts with `setInterval`/`requestAnimationFrame` caused stutter. Keep CSS animations.
- `show-result` split into display (`showResultOnCanvas`) and broadcast (`broadcastResult`) to prevent infinite relay loop
- Student dice animation uses CSS `transition` not JS shuffle — JS shuffle caused twitching

### ⚠️ Mobile / Safari Notes
- Reactions may not show on mobile student side (under investigation — needs second device test)
- PWA manifest set to `orientation: any` to allow portrait on admin mobile
- iOS Safari requires user gesture before AudioContext can play sounds

---

## 9. Classroom Features Reference

### Whiteboard
- Fabric.js canvas (`CANVAS_W=1440, CANVAS_H=1080`)
- Scales with `Math.min` to fit container (was `Math.max` — caused mobile cutoff, do not revert)
- Tools: Draw (pencil), Select, Laser Pointer (teacher only)
- Canvas state synced via `canvas-update` socket event

### Reactions (Teacher Only)
- 8 emoji buttons: 😂 ❤️ 😊 😢 😱 🎉 👏 👍
- 3-second cooldown (buttons gray out)
- Sound plays twice (600ms apart)
- 😢 special: sad faces float UP + tiny 💧 drops fall in background
- 🎉 special: confetti drawn on Fabric canvas + emoji floats

### Laser Pointer (Teacher Only)
- 🔴 button in toolbar
- Glowing red CSS dot follows mouse
- Position sent as ratio (0–1) so works across screen sizes
- `body.laser-mode` class hides cursor globally

### Coin Flip
- CSS coin with gold (🦅 Eagle) / red (🤪 Silly Face) sides
- `flipHeads` / `flipTails` CSS animations (3s)
- Broadcast fires IMMEDIATELY on click → both sides animate simultaneously
- Auto-closes after result (3s)

### Dice Roll
- Real 3D CSS dice with dot faces
- 1x and 2x dice supported
- CSS `transition: transform 2s ease-out` for smooth roll
- Broadcast fires IMMEDIATELY on click
- Auto-closes after result

### Rewards
- Teacher selects reward type: ⭐ Star / 🏆 Trophy / 🥇 Medal (selector in top bar)
- Small button under each student video gives selected reward
- Counter shows `1x⭐ 2x🏆 1x🥇` under student
- Tada sound + confetti celebration on award
- Leaderboard shows all reward types per student

---

## 10. Deployment Notes

### Render (Backend)
- **Paid Starter tier** — always on (free tier sleeps, breaks real-time features)
- Environment variables required:
  - `ADMIN_PASSWORD` — admin reset password (default: `admin1234`)
  - `MONGODB_URI` — MongoDB Atlas connection string
  - `PORT` — auto-set by Render
- Deploys automatically from GitHub on push to `main`

### GitHub Pages (Frontend)
- Deploys automatically from `main` branch of `polyabc-site` repo
- No build step — pure static HTML/JS/CSS
- Changes live within ~60 seconds of push

### MongoDB Atlas
- Free tier cluster
- Collections: `rooms`, `students`, `groups`, `assignments`, `attendance`, `availability`, `trial_bookings`, `config`
- No indexes currently defined (could cause slow queries at scale)
- `config` collection must always have `adminPassword` entry — reset preserves it

---

## 11. Known Bugs & Pending Features

### 🐛 Known Bugs
| Bug | Status | Notes |
|---|---|---|
| Teacher cam black after student reconnect | Unresolved | WebRTC renegotiation issue |
| Audio indicator always shows muted on student side | Unresolved | UI only, audio works |
| Reactions not showing on mobile student side | Under investigation | Needs second device test |
| Duplicate student on teacher side after reconnect | Unresolved | `user-joined` fires twice |
| Laser misalignment on mobile | Unresolved | Canvas scale vs window ratio differs |

### ✅ Fixed Session 4
| Fix | Notes |
|---|---|
| Attendance double records | Rewrote to use `attKeyAsync` — DB lookup instead of client-side cache |
| Student missing from attendance/payroll | `attKeyAsync` guarantees correct scheduledTime for all writes |
| endType always 'ended_early' | Now compares now vs scheduled start + duration |
| Owed timer false positive | Only triggers if teacher 2+ mins late, checked once at page load |
| New Trial button not disappearing on assign | Cleared `isNewTrial` on trial assignment |
| Reset All password always wrong | Uses `getAdminPassword()` with env var fallback |
| Student moving objects when draw disabled | New canvas objects inherit `selectable:false` immediately |
| Reward button spammable | 5-second cooldown per student button |
| Confetti only on whiteboard canvas | Full-screen overlay canvas (`position:fixed, 100vw×100vh`) |
| Trial time slots 30-min only | Now 15-min intervals, all 24 hours shown |

### ⏳ Partially Implemented
| Feature | Status | Notes |
|---|---|---|
| `timeOverride` for teachers | Checkbox added to modal, save/use not implemented | Bypasses 24hr trial booking limit |
| Student fullscreen prompt | Not implemented | |

### 💳 Technical Debt
- No authentication on admin panel (just password modal for destructive actions)
- Canvas updates sent as full JSON on every stroke — expensive at scale
- No rate limiting on socket events
- `roomScheduledTime` is a cache — cleared on server restart. `getScheduledTime()` re-queries DB automatically so this is safe.
- Single server instance — no horizontal scaling

---

## 12. Recommended Future Improvements

### Security
- Add JWT auth to admin panel
- Rate limit socket events (reactions, canvas updates)
- Validate all socket payloads server-side (currently trusted from client)

### Scalability
- Canvas delta updates instead of full JSON
- Redis for in-memory state (`roomScheduledTime`) so it survives restarts
- MongoDB indexes on `room`, `date`, `scheduledTime` fields

### WebRTC
- TURN server for mobile/corporate network users (currently no TURN — peer-to-peer only)
- Renegotiation on reconnect (fixes black cam bug)
- SFU architecture if >6 students per room becomes common

### Code Organization
- Split `classroom.html` (2300+ lines) into separate JS modules
- Same for `server.js` (~900+ lines)
- Shared constants file (room limits, timezone string, etc.)

---

## 13. Coding Conventions & Assumptions

| Convention | Detail |
|---|---|
| Timezone | Always `America/Mexico_City`. Use `todayGDL()` helper on server. |
| Room 101 | Reserved for trial students only. Never assign regular students here. |
| Max students per group | 6. Enforced in `addStudentToGroup()`. Do not raise without testing video grid. |
| Teacher authority | Teacher controls all tools. Students can only draw if teacher enables it. |
| IS_TEACHER flag | Set client-side from URL param `role`. Not verified server-side — trust issue. |
| Canvas dimensions | `CANVAS_W=1440, CANVAS_H=1080`. Scale with `Math.min`. |
| Salary calculation | Based on `hourlyRate` in `rooms` collection × class duration from attendance |
| Font | Nunito (Google Fonts) throughout UI |
| Color scheme | Dark navy `#16213e` / `#0f3460` base, gold `#ffd740` accents |

---

## 14. File Locations (Development)

```
/home/claude/polyabc-site/     ← Frontend repo
/home/claude/polyabc-server/   ← Backend repo
```

Both push to GitHub and auto-deploy. Always run `node --check server.js` before pushing backend changes.

---

*This document should be updated whenever significant architectural changes are made. Future AI assistants: please add your name and date to the header when you expand this file.*

---

## ⚠️ CRITICAL: Attendance System (Rewritten Session 4)

### The Old Way (DO NOT REVERT)
Previously attendance used `attKey(room)` which read `roomScheduledTime[room]` — an in-memory cache populated when the client emitted `timer-info`. This caused race conditions: if teacher/student joined before `timer-info` fired, records were created with `scheduledTime: ''`, creating duplicate records and missing student data.

We tried a pending queue system — it was too complex and still had race conditions.

### The New Way (Current)
`attKeyAsync(room)` — an async function that looks up scheduledTime **directly from MongoDB**:

```javascript
async function attKeyAsync(room) {
  const today = todayGDL();
  const st = await getScheduledTime(room); // queries assignments collection
  return { room, date: today, scheduledTime: st || '' };
}

async function getScheduledTime(room) {
  if (roomScheduledTime[room]) return roomScheduledTime[room]; // cache hit
  const today = todayGDL();
  const assignment = await assignmentsCol().findOne({ room, date: today });
  if (assignment?.time) {
    roomScheduledTime[room] = assignment.time; // populate cache
    return assignment.time;
  }
  return null;
}
```

**Every** attendance operation uses `attKeyAsync`:
- `join-room` (teacher) → `attKeyAsync` → upsert with `teacherLoginAt`
- `join-room` (student) → `attKeyAsync` → push to students array
- `class-opened` → `attKeyAsync` → set `teacherOpenedAt`
- `class-started` → `attKeyAsync` → set `classStartedAt`
- `end-class` → `attKeyAsync` → set `classEndedAt` + `endType`
- `student-leaving` → `attKeyAsync` → set `students.$.leftAt`
- `disconnect` → `attKeyAsync` (via `.then()`) → set `leftAt` or `invalid_termination`

### endType Logic
`end-class` calculates `endType` using scheduled time + duration:
```javascript
const schedEnd = new Date(nowTs);
schedEnd.setHours(hh, mm + durationMins, 0, 0); // scheduled end time
endType = nowTs >= schedEnd ? 'completed' : 'ended_early';
```
This means: class is `completed` if teacher ends it at or after the scheduled end time.

### Payroll Merge Safety Net
Payroll endpoint merges records by `date + scheduledTime` before calculating, in case two records ever get created for the same class. This handles legacy data and edge cases without breaking anything.

---

## ⚠️ CRITICAL: Owed Timer (Fixed Session 4)

The owed timer was incorrectly triggering for on-time teachers. 

**Rules:**
- Only shows if teacher enters classroom MORE THAN 2 minutes after scheduled start
- Checked ONCE at page load — never inside the `setInterval` loop
- Shows fixed label "Late: X min owed" while class is running
- Only starts counting DOWN after the original scheduled end time passes

**Do not move the owed timer check back inside the setInterval — it will fire for every teacher.**

---

### Extra Known Bugs
- Backend room full message still says "max 4 students" (should reflect actual limit)
- Duplicate socket handlers exist for student draw/camera toggles
- Exam UI still references 15 questions in some text (should be 20)
- Attendance student-leaving tracking may fail on abrupt disconnect

### AI Workflow Agreement
- **Update this file after every major architectural change**
- Document assumptions before fixing bugs
- Avoid renaming core socket events without documenting the change here
- Keep frontend/backend socket event names in sync at all times
- Record known bugs here BEFORE fixing them

### Current Priorities (as agreed between AI assistants)
1. Stabilize attendance + payroll system
2. Improve WebRTC reconnect reliability
3. Reduce mobile lag / test on second device
4. Harden auth/security (admin panel has no real auth)
5. Improve long-term maintainability (split large files)

---

## 16. Session Changelog (most recent first)

### Session 5 — Claude
- **BULLETPROOF ATTENDANCE: sessionId system**
  - Every assignment now gets a unique `sessionId` (e.g. `sess_a3f9b2`) on creation
  - `greeting.html` fetches today's assignments and picks the closest one (within 90 min), passes its `sessionId` to classroom URL
  - `classroom.html` reads `sessionId` from URL, sends it in every `join-room` emit
  - Server stores `sessionId` per socket in `mySessionId`, registers it in `roomSessionId[room]` so students inherit it
  - `attKeyAsync(room, sessionId)` looks up the exact assignment by `_id` — zero guessing, zero clock math
  - All attendance writes (teacher join, student join, class opened, class started, class ended, student leaving, disconnect) pass `mySessionId`
  - Falls back gracefully to old time-based method for legacy assignments without `sessionId`
  - `roomSessionId[room]` cleared on `end-class` so next class starts fresh
  - `sessionId` stored in attendance record for direct payroll matching
  - **Result**: 3 classes same day same teacher → 3 perfect separate attendance records, always, forever

### Session 4 — Claude (latest)
- Rewrote attendance system: `attKeyAsync()` queries DB directly for scheduledTime
- Fixed owed timer false positives (2+ min threshold, once at page load)
- Fixed New Trial button not disappearing on assignment
- Fixed Reset All password always failing
- Fixed student moving objects when draw disabled
- Added 5s cooldown on reward buttons
- Full-screen confetti overlay
- 15-min trial booking intervals, all 24 hours shown
- Coin/dice animations now show on student side simultaneously
- Added laser pointer tool (teacher only, real-time to students)
- Added ⭐🏆🥇 reward selector
- Added 3D CSS dice with real dot faces
- Added CSS coin flip with 🦅/🤪 sides
- Reactions panel hidden from students, panel shows teacher-only
- Full emoji reaction system with particle engine
- AI_NOTES.md now updated on every commit

### Session 3 — Claude
- WebRTC polite peer pattern for race conditions
- Admin panel mobile layout + hamburger menu
- Payroll calculation system
- Attendance per-class tracking with Mexico City timezone fix
- Trial student flow (Room 101, 24hr limit, booking calendar)
- Class scheduling with room locks
- PWA setup

### Session 2 — Claude
- Classroom tools: reactions, coin, dice, laser pointer, rewards
- Student-to-student video enabled
- Canvas scaling fix (Math.min)
- Star reward + confetti system
- Leave class modal
- Student waiting screens

### Session 1 — Claude
- Initial platform build
- WebRTC audio/video
- Whiteboard (Fabric.js)
- Room lock/open system
- Dynamic student video slots
- Screen sharing

### Session 4 continued — fixes after successful attendance test
- Canvas click area fixed: `wrap.style.width/height` set to scaled canvas size so right side is clickable
- Timer now shows reliably: teacher gets fallback from `timer-info` if `loadSchedule` missed it

