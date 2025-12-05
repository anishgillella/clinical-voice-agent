# Phase 6: Testing, Demo & Submission

## Goals
- Verify the entire flow works smoothly.
- Record the 2-3 minute demo video.
- Finalize the README and code cleanup.

## Time Estimate
- **3-4 Hours**

## Testing Strategy

### 1. Manual End-to-End Test
Follow this script for your final verification:
1. **Start:** Open app, click "Start Interview".
2. **Intro:** "Hi, I'm Sarah, 34 years old." -> Check UI updates.
3. **Symptom:** "I've had a throbbing headache for 3 days." -> Check UI updates.
4. **Edit:** Manually change "Throbbing" to "Severe" in the UI while speaking -> Check sync.
5. **Off-topic:** "Did you see the game last night?" -> Check agent redirect.
6. **End:** "That's all." -> Click End.
7. **Review:** Check the generated SOAP note.

### 2. Demo Video Recording
- **Tool:** QuickTime (Mac) or Loom.
- **Setup:** Split screen (App on left, Terminal logs on right to show "under the hood" if you want, or just the App).
- **Script:** Use the exact flow from the Manual Test above.
- **Voiceover:** Briefly explain what is happening: "Notice how the 'Age' field updated instantly..."

### 3. Code Cleanup
- Remove `print` statements (use `logger`).
- Add comments to complex logic (especially the WebSocket/DataChannel parts).
- Ensure `.env.example` is present and secrets are NOT in git.

### 4. Final README
Update the root `README.md` with:
- **How to run:**
  ```bash
  # Backend
  cd backend && python main.py dev
  # Frontend
  cd frontend && npm run dev
  ```
- **Tech Stack:** Explicitly list LiveKit, Deepgram, OpenAI, Next.js.
- **Architecture Diagram:** Link to the one we created in `docs/architecture-overview.md`.

## Submission Checklist
- [ ] Code pushed to GitHub.
- [ ] Repo is public (or shared with reviewer).
- [ ] Demo video link included in README.
- [ ] `.env` file excluded from git.
