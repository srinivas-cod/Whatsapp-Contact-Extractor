
 WhatsApp Contact Saver 📱

A Chrome Extension that extracts and exports phone numbers from WhatsApp Web — including hidden numbers of saved contacts and bulk group member extraction.

🎯 Problem It Solves
WhatsApp Web hides phone numbers of saved contacts and only renders ~15 group members at a time. Basic scrapers fail completely. This extension bypasses both limitations.

 ✨ Features
- Save phone number from any individual chat
- Bulk extract all members from a group (auto-scrolls automatically)
- Add custom notes and group tags to contacts
- Export everything as a `.csv` file
- Duplicate prevention built-in


 🚀 Installation
1. Go to `chrome://extensions/`
2. Enable Developer mode
3. Click Load unpacked → select this folder
4. Pin the extension to your toolbar

 📂 Files

| File                       | Purpose 

| `manifest.json`            | Extension config — permissions & script rules 
| `popup.html` / `style.css` | The UI dropdown panel 
| `popup.js`                 | Handles buttons, storage, and CSV export 
| `content.js`               | Bridge — runs inside WhatsApp tab, controls auto-scrolling 
| `inject.js`                | Hacker script — reads WhatsApp's hidden React memory 



⚙️ How It Works
WhatsApp Web is built with React JS. Phone numbers are not in the visible HTML — they live inside React's internal memory. `inject.js` hooks into `__reactFiber$` (a hidden React backdoor on every DOM element) to read the actual contact data. `content.js` auto-scrolls the group list every 250ms so every member gets scanned before the result is returned to the popup.



 ⚠️ Note
May break if WhatsApp updates their internal React structure. Selectors may need updating in that case.
