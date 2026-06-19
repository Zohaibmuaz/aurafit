# Aura - Holistic Wellness App (Development Plan)

Yeh plan user requirements ke mutabiq design kiya gaya hai jisme app ko responsive banana, MySQL database ke sath login system setup karna, aur analytics ko real data se connect karna shamil hai.

---

## 🛠️ Proposed Development Phases

### Phase 1: Database Setup (MySQL)
- **Tasks:**
  - Database schema (`aura_db`) design karna.
  - SQL table structure banana:
    - `users`: User registration, authentication credentials (email, password hash).
    - `user_profiles`: Name, Age, Gender, Location, Weight, Height, Goal, Skin Type, Hair Type, Profile Pic.
    - `user_progress`: Current Water Count, Daily Coins, Last Sync Date, current status.
    - `analytics`: Weekly steps, sleep efficiency, calories burned, hydration history.
  - Database configuration aur connection test script add karna.

### Phase 2: Backend Development (Node.js + Express)
- **Tasks:**
  - Backend project initialize karna (`package.json`, dependencies: `express`, `mysql2`, `bcryptjs`, `jsonwebtoken`, `cors`, `dotenv`).
  - Secure Authentication routes banana:
    - `/api/auth/signup` (Naya account banana aur default data insert karna).
    - `/api/auth/login` (User credentials verify karke JWT token return karna).
  - Profile & Progress endpoints:
    - `/api/profile` (Profile update aur fetch karne ke liye).
    - `/api/progress` (Water tracker state, coins list sync karne ke liye).
  - Analytics API:
    - `/api/analytics` (Real-time analytics fetch aur save karne ke liye).

### Phase 3: Responsive UI/UX Redesign
- **Tasks:**
  - CSS (`style.css`) ko update karna taake desktop browsers par proper dashboard layout dikhayi de (wide grid layout, sidebar ya centered container limits bypass karna).
  - Mobile screens par layout ko original mobile look aur navigation tab me hi rakhna.
  - Media queries add karna jo browser screen size ke mutabiq UI ko adjust karein.
  - Premium dark theme aur glassmorphic design ko as it is maintain rakhna bina components ko disturb kiye.

### Phase 4: Frontend Auth Integration
- **Tasks:**
  - `index.html` me dynamic Login aur Signup forms add karna (tab active switch hone se pehle).
  - `app.js` me authentication states handle karna (save JWT in `localStorage`/`sessionStorage` and fetch user state from backend instead of local client-side values).
  - Unauthorized user ko automatically login/signup screen par redirect karna.

### Phase 5: Real Analytics Integration
- **Tasks:**
  - Hardcoded cards (Steps, Sleep, Hydration, Coins) ko back-end dynamic data se connect karna.
  - Daily tasks (like drinking water, spinning wheel, completing workouts) complete hone par backend database me update save karwana.
  - Analytics page ko DB se weekly data query kar ke render karna.

---

## 🚀 Timeline & Priority

1. **High Priority:** Responsive Layout & Database Schema definition.
2. **Medium Priority:** Auth API & UI implementation.
3. **Low Priority:** Migration of offline trackers to online DB-backed APIs.
