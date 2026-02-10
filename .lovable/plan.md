

# AuraDesk -- Full App Audit, Optimization Plan, and Future Vision

---

## Part 1: Issues Found and Fixes

### A. Performance Issues

**1. N+1 Query Problem in `useConversations`**
The `fetchConversations` hook makes a separate database query for every conversation to fetch its members. With 50 conversations, that is 51 queries per load. This should be consolidated into a single query using a join or a batch `in()` call.

**2. N+1 Query in `useTeams`**
Same pattern -- after fetching teams, it loops through each one to get `member_count` with individual `count` queries. This should use a single aggregated query or a database view.

**3. `useConversations` Missing Dependency**
The `useEffect` depends on `user` but `fetchConversations` is defined outside the effect and captures `user` via closure. If `user` changes reference but not ID, it causes unnecessary refetches. Should depend on `user?.id`.

**4. Dashboard Hardcoded Stats**
The dashboard stats ("12 Active Teams", "2,847 Messages") are completely hardcoded. This gives a misleading impression. They should either be fetched from the database or removed/labeled as placeholders.

**5. Subscription Check Polling**
`useSubscription` polls every 60 seconds. This is aggressive for a subscription status that rarely changes. Should be increased to 5-10 minutes or use a realtime listener.

**6. Settings Page Auto-Requests Camera/Mic**
`loadMediaDevices()` in Settings immediately calls `getUserMedia({ audio: true, video: true })` just to get device labels. This triggers a browser permission prompt on first visit to Settings, which is jarring. Should enumerate devices first and only request permission when the user interacts with voice settings.

### B. Stability / Bug Fixes

**7. WebRTC `isConnected` Set Too Early**
In `joinRoom`, `setIsConnected(true)` is called when the Supabase channel subscription status is `SUBSCRIBED` (line 1209). This is the signaling channel, not the actual peer connection. `isConnected` should only be `true` when `pc.connectionState === 'connected'`. This causes the UI to show "connected" before any peer is actually connected.

**8. Memory Leak in WebRTC Health Check**
The `healthCheckInterval` created inside `createPeerConnection` (line 741) is cleaned up on `connectionstatechange` to `closed/failed`, but if the peer connection is replaced (e.g., during relay escalation where `pc.close()` is called and a new one created), the old interval may not be cleared because the event listener is on the old `pc` object. The interval reference should be stored in a map and explicitly cleared.

**9. Stale Closure in `endCurrentCall`**
`CallContext.endCurrentCall` captures `activeCall` from its closure. If called rapidly or from an effect, it may reference stale state. Using `activeCallRef.current` instead (which already exists) would be safer.

**10. Missing Error Handling in `sendMessage` (Chat)**
`useMessages.sendMessage` silently logs errors but never shows the user any feedback. Failed messages should show a toast or inline error.

**11. `leaveRoom` Missing `failedConnections` Cleanup**
The `leaveRoom` function clears most refs but does not clear `failedConnections.current`, which could cause stale relay escalation state if the user joins another call in the same session.

### C. Security Issues

**12. Overly Permissive RLS Policies**
The linter found 2 RLS policies using `USING (true)` or `WITH CHECK (true)` for INSERT/UPDATE/DELETE. These need to be scoped to the authenticated user.

**13. Leaked Password Protection Disabled**
The database linter reports that leaked password protection is disabled. This should be enabled to prevent users from using compromised passwords.

**14. TURN Server Credentials Hardcoded**
The Metered.ca TURN server credentials are hardcoded in the client-side code (`useWebRTC.tsx`). While these are free-tier keys, they could be abused. Ideally these should be fetched from a backend function with short-lived credentials.

### D. UX Polish

**15. Teams Page Missing Mobile Full-Screen Layout**
Unlike the Chat page (which now uses `absolute inset-0`), the Teams page does not fill the screen on mobile when viewing channels or chat. It should use the same pattern.

**16. `onKeyPress` Deprecated**
The AI page uses `onKeyPress` which is deprecated in React. Should be `onKeyDown`.

---

## Part 2: Optimization Plan (Implementation Steps)

### Step 1: Fix N+1 Queries
- Refactor `useConversations` to batch-fetch all member profiles in one query using `in()`.
- Refactor `useTeams` to use a single query with aggregated count (or a database view).

### Step 2: Fix WebRTC Stability
- Remove premature `setIsConnected(true)` from channel subscription callback.
- Store health check intervals in a ref map and clear them properly on connection replacement.
- Clear `failedConnections` ref in `leaveRoom`.
- Use `activeCallRef.current` in `endCurrentCall`.

### Step 3: Fix UX Issues
- Make dashboard stats dynamic or clearly label them as demo data.
- Add error feedback (toast) when `sendMessage` fails in chat.
- Fix Teams page mobile layout to match Chat page pattern.
- Replace `onKeyPress` with `onKeyDown` in AI page.
- Defer camera/mic permission request in Settings until user opens Voice tab.

### Step 4: Security Hardening
- Tighten the 2 overly permissive RLS policies to scope to authenticated users.
- Enable leaked password protection.

### Step 5: Reduce Polling
- Change subscription check interval from 60s to 300s (5 minutes).

---

## Part 3: Overall App Rating

**Rating: 7.2 / 10**

### Strengths
- **Ambitious scope, well-executed**: A unified workspace with chat, teams, meetings, AI, file storage, calling -- all in one React SPA. That is genuinely impressive.
- **Multi-platform coverage**: Web, PWA, Electron, Android (Capacitor) with deep-link OAuth, splash screens, push notifications. Very few indie projects get this far.
- **Solid design system**: The "Cosmic Aura" visual identity is consistent and premium-feeling. Glassmorphism, neon accents, theme support, and animated elements give it a distinctive look.
- **Smart WebRTC architecture**: Tiered connection strategy (direct P2P, STUN, hybrid, TURN relay) with automatic escalation, adaptive video quality, and ICE restart recovery. This is production-grade thinking.
- **MFA enforcement**: Properly blocks access at AAL1 when TOTP factors exist. Many apps skip this.
- **AI integration**: Multi-model support with streaming responses, local AI fallback, token usage tracking per subscription tier.

### Weaknesses
- **N+1 query patterns**: Will cause noticeable slowdowns as user base grows (50+ conversations, 20+ teams).
- **Hardcoded dashboard data**: Breaks user trust -- shows fake numbers.
- **WebRTC still fragile**: The premature `isConnected` flag and health check memory leaks could cause confusing UX during calls.
- **No offline support beyond PWA shell**: Messages, files, and AI are all fully online. No optimistic UI or offline queue.
- **No end-to-end encryption**: Messages are stored as plaintext in the database. For a product positioning itself alongside Teams and similar tools, this is a gap.
- **Test coverage**: No test files visible in the project. Zero automated tests for a codebase of this size is a risk.

---

## Part 4: Future Ideas

### Near-Term (1-3 months)
1. **Screen sharing in calls** -- The UI button exists but the WebRTC `getDisplayMedia` integration needs completion.
2. **Message reactions and replies** -- Threading/reply chains and emoji reactions for chat messages.
3. **Read receipts and delivery status** -- Show who has read a message, with checkmark indicators.
4. **File sharing in chat** -- Drag-and-drop file attachments directly in conversations.
5. **User presence/online status** -- Real-time green/yellow/red dots showing who is online, idle, or offline using Supabase presence.

### Medium-Term (3-6 months)
6. **End-to-end encryption** -- Client-side encryption for messages using Signal Protocol or similar.
7. **Calendar integration** -- Sync meetings with Google Calendar / Outlook.
8. **Notification center** -- Unified in-app notification feed with filtering.
9. **Admin dashboard** -- Team analytics, usage reports, user management for workspace owners.
10. **iOS App Store build** -- Capacitor iOS build with proper signing and App Store submission.

### Long-Term (6-12 months)
11. **AI meeting copilot** -- Real-time transcription during calls with live summaries, action items, and follow-up email drafts.
12. **Custom integrations** -- Webhooks, Zapier/Make connections, API for third-party tools.
13. **White-label / multi-tenant** -- Allow organizations to deploy branded instances.
14. **Desktop app auto-update** -- The Electron update infrastructure exists but needs signed builds and a release pipeline.

---

## Part 5: 5-Year Outlook

AuraDesk is positioned in a crowded but massive market (unified communications / collaboration). Here is an honest assessment:

**Bull case**: If the team focuses on reliability first (fixing the WebRTC issues, adding E2E encryption, building test coverage) and then pursues a niche market (small businesses, freelancers, or privacy-focused teams), it could carve out a viable space. The all-in-one approach at a lower price point than Microsoft 365 or Slack+Zoom combos has real appeal. The AI integration is a differentiator if it delivers genuine value (smart summaries, auto-scheduling, draft emails from meeting notes). A realistic scenario is a few thousand paying users generating sustainable indie revenue.

**Bear case**: Competing head-on with Teams, Slack, Zoom, and Discord is extremely difficult. These products have thousands of engineers, massive infrastructure budgets, and deep enterprise integrations. Without significant investment in reliability, security certifications (SOC 2, GDPR compliance), and a dedicated team, enterprise adoption is unlikely. The WebRTC-based calling will always be less reliable than dedicated media servers (which cost money to run at scale).

**Realistic prediction**: With consistent development effort, AuraDesk could become a solid product for small teams and indie creators within 2-3 years. The 5-year outcome depends heavily on whether it finds a specific niche and doubles down on it, rather than trying to be everything for everyone. The technology foundation is strong -- the challenge is product-market fit and sustained execution.

