// Helper: Uses regex to confidently identify if a string is a formatted international phone number
function isPhoneNumber(str) {
    return /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\./0-9]*$/.test(str) && str.replace(/\D/g, '').length >= 7;
}

/**
 * Searches inside a specific parent element to find the deepest scrollable container.
 * This is crucial for defeating WhatsApp's dynamic UI layouts.
 */
function findScrollableInside(parent) {
    if (!parent) return null;
    let divs = parent.querySelectorAll('div');
    for (let div of divs) {
        let style = window.getComputedStyle(div);
        if ((style.overflowY === 'scroll' || style.overflowY === 'auto' || style.overflowY === 'overlay') && div.clientHeight > 150) {
            return div;
        }
    }
    return null;
}

/**
 * The "Firewall" Function
 * This isolates exactly where we want to scrape, completely ignoring the rest of WhatsApp - Instead of scraping all the chats of whatsapp web
 */
function findListContainer() {
    // Attempt 1: Look for the specific "Search members" popup modal 
    let dialog = document.querySelector('[role="dialog"]') || document.querySelector('[aria-modal="true"]');
    if (dialog) return findScrollableInside(dialog);
    
    // Attempt 2: Look for the Group Info sidebar (which sits to the right of the main chat)
    let main = document.querySelector('#main');
    if (main && main.nextElementSibling) {
        return findScrollableInside(main.nextElementSibling);
    }
    
    // Attempt 3: Desperate fallback. Find any large scrollable box that ISN'T the chat list or message area.
    const allDivs = document.querySelectorAll('div');
    for (let div of allDivs) {
        if (div.closest('#pane-side') || div.closest('#main')) continue; // Explicitly block the left/middle panes
        let style = window.getComputedStyle(div);
        if ((style.overflowY === 'scroll' || style.overflowY === 'auto' || style.overflowY === 'overlay') && div.clientHeight > 200) {
            return div;
        }
    }
    return null;
}

// Inject our React Props hacker script into the main page
const s = document.createElement('script');
s.src = chrome.runtime.getURL('inject.js');
s.onload = function() {
    this.remove(); // Clean up the DOM
};
(document.head || document.documentElement).appendChild(s);

// ----------------------------------------------------------------------------
// Main Message Listener: Handles requests from the Chrome Extension Popup
// ----------------------------------------------------------------------------
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    
    // FEATURE 1: Single Contact Saving
    if (request.action === "getContact") {
        const contactElement = 
            document.querySelector('[data-testid="conversation-info-header-chat-title"]') ||
            document.querySelector('#main header span[dir="auto"][title]') ||
            document.querySelector('#main header span[dir="auto"]');
            
        let visualName = contactElement ? contactElement.innerText.trim() : "No Contact Found";
        
        const resultListener = (e) => {
            document.removeEventListener("WACS_Current_Result", resultListener);
            const data = JSON.parse(e.detail);
            
            let finalName = data.name || visualName;
            let finalPhone = data.phone || "";
            
            // If we didn't find a phone from React but the visual name IS a phone number
            if (!finalPhone && isPhoneNumber(visualName)) {
                finalPhone = visualName;
                finalName = "Unsaved";
            }
            
            sendResponse({ contact: visualName, name: finalName, phone: finalPhone });
        };
        
        document.addEventListener("WACS_Current_Result", resultListener);
        document.dispatchEvent(new CustomEvent("WACS_Extract_Current"));
        
        return true; // Keep the message channel open for the async response
        
    // FEATURE 2: Bulk Group Extraction
    } else if (request.action === "autoScrapeGroup") {
        let scrollableContainer = findListContainer();

        if (!scrollableContainer) {
            sendResponse({ error: "Could not find the group members list. Please open the 'Search members' modal or 'Group info' sidebar first." });
            return;
        }
        
        scrollableContainer.setAttribute('data-wacs-container', 'true');

        let collected = new Map();
        
        const resultListener = (e) => {
            const results = JSON.parse(e.detail);
            results.forEach(r => {
                collected.set(r.phone, { name: r.name, phone: r.phone, note: "Group Member" });
            });
        };
        
        document.addEventListener("WACS_Result", resultListener);

        // Reset scroll position to top before starting
        scrollableContainer.scrollTop = 0;
        let lastScrollTop = -1;
        let stuckCounter = 0;
        
        // Grab the actual Group Name from the chat header so we can automatically tag the CSV
        let detectedGroupName = "Extracted Group";
        const titleElement = document.querySelector('[data-testid="conversation-info-header-chat-title"]');
        if (titleElement && titleElement.innerText) {
            detectedGroupName = titleElement.innerText.trim();
        }
        
        const scrollInterval = setInterval(() => {
            document.dispatchEvent(new CustomEvent("WACS_Extract"));
            
            scrollableContainer.scrollTop += Math.floor(scrollableContainer.clientHeight * 0.8);
            
            if (Math.abs(scrollableContainer.scrollTop - lastScrollTop) < 5) {
                stuckCounter++;
                if (stuckCounter >= 4) { 
                    clearInterval(scrollInterval);
                    document.removeEventListener("WACS_Result", resultListener); // Clean up
                    scrollableContainer.removeAttribute('data-wacs-container');
                    sendResponse({ success: true, members: Array.from(collected.values()), groupName: detectedGroupName });
                }
            } else {
                lastScrollTop = scrollableContainer.scrollTop;
                stuckCounter = 0;
            }
        }, 250); 
        
        return true; // Keeps the sendResponse channel open for the async setInterval
    }
});