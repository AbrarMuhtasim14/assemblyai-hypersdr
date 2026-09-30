# 🎬 HyperSDR — 2-Minute Hackathon Video Walkthrough Script
**Submission:** AssemblyAI Voice Agent Hackathon 2026 (Lablab.ai)  
**Target Duration:** Exactly 2 Minutes (120 seconds | ~270 words)  
**Presenter:** Syed Mohammed Abrar Mohtasim  
**Live App:** [https://hypersdr-assemblyai.onrender.com](https://hypersdr-assemblyai.onrender.com)  
**GitHub:** [https://github.com/AbrarMuhtasim14/assemblyai-hypersdr](https://github.com/AbrarMuhtasim14/assemblyai-hypersdr)

---

## ⏱️ Video Timeline Breakdown

```
[0:00 - 0:25] ⚡ The Hook & Problem (Why Boutique Hotels?)
[0:25 - 0:50] 🧠 Solution & AssemblyAI Voice Stack Architecture
[0:50 - 1:30] 🎙️ Live Demo: Voice Call + Google Calendar Tool Calling
[1:30 - 1:50] 📊 Post-Call BANT Intelligence & Live Google Sheet Sync
[1:50 - 2:00] 🚀 Conclusion & Submission Links
```

---

## 📜 Full Word-for-Word Script & Visual Cues

---

### **[0:00 – 0:25] The Hook & The Problem**
🎬 **Visual on Screen:**  
*Show the HyperSDR Dashboard on Render (`https://hypersdr-assemblyai.onrender.com`). Highlight the "212 Pre-Enriched Leads" and the calculated `$338,538 Annual OTA Loss` badge.*

🎙️ **Voiceover:**
> "Hi everyone, I’m Abrar, and this is **HyperSDR**—an autonomous voice sales agent built for the AssemblyAI Voice Agent Hackathon.
> 
> In the US, independent boutique hotels and historic inns lose **18 to 22% of their top-line revenue** to Expedia and Booking.com commissions—even when repeat guests rebook. A single 20-room inn bleeds over **$300,000 every year**, while constantly risking their Google 3-Pack placement from unaddressed complaints.
> 
> They can't afford dedicated sales teams. That's why we built HyperSDR."

---

### **[0:25 – 0:50] The Solution & AssemblyAI Stack**
🎬 **Visual on Screen:**  
*Switch briefly to the slide showing the architecture diagram (WebAudio → Node Server → AssemblyAI `wss://agents.assemblyai.com/v1/ws` → Google Calendar & Sheets API).*

🎙️ **Voiceover:**
> "HyperSDR is powered by **AssemblyAI’s Voice Agent API**, utilizing the **Universal-3.5 Pro** streaming speech-to-text engine and the ultra-low-latency **George** voice.
> 
> We integrated sub-second voice activity detection with barge-in capability, and built a custom **LiveKit-style WebAudio comfort noise generator** to eliminate digital dead-air.
> 
> Combined with real-time JSON-schema tool calling, HyperSDR doesn't just chat—it executes full sales workflows in-call."

---

### **[0:50 – 1:30] Live Interactive Voice Demo**
🎬 **Visual on Screen:**  
*Click **"Start Call with Alex"** on the lead **"The Inn On First" (Jim Gunther)**. Speak into the microphone and trigger the booking.*

🎙️ **Live Interaction Dialogue:**

- **Alex (AI SDR):**  
  > *"Hi Jim! Calling from Boutique Review Concierge. Loved seeing traveler praise for your scratch-made culinary breakfasts in Napa. Are you currently losing 18% to Expedia when those guests rebook?"*

- **You (Presenter as Innkeeper):**  
  > *"Yes, OTA commissions are killing our margins. What do you suggest?"*

- **Alex (AI SDR):**  
  > *"We implement a 48-hour private post-stay review routing system that protects your Google 3-Pack and shifts repeat guests directly to your website. Can we grab 15 minutes this Thursday at 2:00 PM EST to review your revenue recovery roadmap?"*

- **You (Presenter):**  
  > *"Sure, Thursday at 2 PM works. Let's do it."*

- **Alex (AI SDR):**  
  > *"Locked in! I've sent the Google Calendar invite with a Google Meet link directly to your email."*

🎬 **Visual on Screen:**  
*Point cursor to the live terminal/UI showing **`book_calendar_slot`** tool firing, generating real Google Calendar Event ID and an authentic Google Meet URL (`https://meet.google.com/...`).*

---

### **[1:30 – 1:50] Speech Intelligence & 2-Way Google Sheet Sync**
🎬 **Visual on Screen:**  
*Click **"End Call"**. Show the instant BANT Analysis pop-up (Budget, Authority, Need, Timeline: 100/100). Then switch to the live Google Sheet tab and show Row 2 instantly updating with `COMPLETED`, `meeting_booked: YES`, and the Google Meet link.*

🎙️ **Voiceover:**
> "The moment the call concludes, HyperSDR’s **Post-Call Speech Intelligence** kicks in—extracting BANT qualification scores, executive summaries, and action items.
> 
> Through **Google Sheets API v4**, the call outcome, meeting slot, and Google Meet URL are written back **live to our cloud spreadsheet database** with zero human data entry."

---

### **[1:50 – 2:00] Conclusion & Live Links**
🎬 **Visual on Screen:**  
*Show the GitHub repository (`assemblyai-hypersdr`) and the deployed Render link badge.*

🎙️ **Voiceover:**
> "HyperSDR is **100% live and production-ready** on Render, loaded with 212 pre-qualified luxury hotel leads.
> 
> Check out the live demo and full codebase on GitHub. Thank you AssemblyAI and Lablab.ai!"

---

## 💡 Quick Video Recording Tips:

1. **Resolution:** Record in **1080p (1920x1080)** 16:9 widescreen using OBS Studio or Loom.
2. **Audio Setup:** Use a clear microphone and turn up your system audio slightly so Alex's voice playback is clearly heard by the audience.
3. **Tabs to Have Pre-Opened Before Recording:**
   - **Tab 1:** Live Web Dialer (`https://hypersdr-assemblyai.onrender.com`)
   - **Tab 2:** Google Spreadsheet (`https://docs.google.com/spreadsheets/d/1g7cJF2smRWjYsyOfMkJCFRhKMDgOubrf0XnSgDwZcLE`)
   - **Tab 3:** GitHub Repository (`https://github.com/AbrarMuhtasim14/assemblyai-hypersdr`)
4. **Pacing:** Speak with confidence and excitement—keep the demo call focused on the Thursday 2 PM booking so tool calling triggers instantly!
