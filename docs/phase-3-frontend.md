# Phase 3: Frontend & Real-Time UI

## Goals
- Build the Next.js application structure.
- Create the real-time patient intake form.
- Implement the "Live Session" vs "Clinician Review" modes.
- Connect to the LiveKit room.

## Time Estimate
- **4-6 Hours**

## Technical Approach

### 1. Project Setup
Initialize a Next.js 14 project with Tailwind CSS.

```bash
npx create-next-app@latest frontend --typescript --tailwind --eslint
npm install livekit-client livekit-server-sdk react-hook-form lucide-react
```

### 2. Component Structure

```
frontend/
  ├── app/
  │   ├── page.tsx            # Landing & Room Connection
  │   ├── room/page.tsx       # Main Active Call Interface
  │   └── api/token/route.ts  # Token Generation API
  ├── components/
  │   ├── ActiveCall.tsx      # Wrapper for the call
  │   ├── LiveForm.tsx        # The patient data form
  │   ├── Transcript.tsx      # Scrolling transcript
  │   └── ConnectionStatus.tsx
  └── lib/
      └── types.ts            # Shared types with backend
```

### 3. Real-Time Updates (The "Magic")
We will use the `useDataChannel` hook from LiveKit to listen for updates from the Python agent.

```tsx
// components/LiveForm.tsx
import { useDataChannel } from "@livekit/components-react";

export default function LiveForm() {
  const { register, setValue } = useForm();

  // Listen for data from Python Agent
  useDataChannel((msg) => {
    const payload = JSON.parse(new TextDecoder().decode(msg.payload));
    if (payload.type === "UPDATE_RECORD") {
      // Update form fields with animation
      Object.entries(payload.data).forEach(([key, value]) => {
        setValue(key, value);
        triggerHighlightAnimation(key); // Visual cue
      });
    }
  });

  return (
    <form>
      <input {...register("name")} placeholder="Name" />
      {/* ... other fields */}
    </form>
  );
}
```

### 4. Interactive Editing & Locking
- **User Edits:** When a user types in a field, mark that field as `isLocked`.
- **Logic:**
  ```tsx
  // Inside useDataChannel callback
  if (payload.type === "UPDATE_RECORD") {
    Object.entries(payload.data).forEach(([key, value]) => {
      // ONLY update if the user hasn't touched it
      if (!fieldStates[key].isLocked) {
        setValue(key, value);
        triggerHighlightAnimation(key);
      }
    });
  }
  ```

## UI/UX Design
- **Layout:** Split screen. Left side = Transcript (chat bubbles). Right side = Live Form.
- **Visuals:** Clean, medical aesthetic (whites, blues, grays).
- **Feedback:** When the agent updates a field, it should flash green.
- **Locking:** When a user edits a field, show a small "lock" icon to indicate the AI can no longer change it.

## Testing Checklist
- [ ] Verify the frontend connects to the LiveKit room.
- [ ] Verify audio works (can hear/speak).
- [ ] Verify that when the agent calls `update_patient_record`, the React form updates instantly.
- [ ] Verify manual editing works without fighting the AI.
