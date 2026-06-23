document.addEventListener("WACS_Extract", function() {
    let results = [];
    
    const container = document.querySelector('[data-wacs-container="true"]') || document;
    const items = container.querySelectorAll('[role="listitem"], [role="row"]');
    
    items.forEach(item => {
        let fiber = null;
        for (let key in item) {
            if (key.startsWith('__reactFiber$')) {
                fiber = item[key];
                break;
            }
        }
        
        let foundPhone = null;
        let foundName = null;
        
        if (fiber) {
            let current = fiber;
            let attempts = 0;
            while (current && attempts < 15 && !foundPhone) {
                if (current.memoizedProps) {
                    let props = current.memoizedProps;
                    
                    // Structure 1: props.contact
                    if (props.contact && props.contact.id && props.contact.id.user) {
                        foundPhone = props.contact.id.user;
                        if (props.contact.name) foundName = props.contact.name;
                        else if (props.contact.pushname) foundName = props.contact.pushname;
                    }
                    // Structure 2: props.participant
                    else if (props.participant && props.participant.id && props.participant.id.user) {
                        foundPhone = props.participant.id.user;
                    }
                    // Structure 3: direct props
                    else if (props.id && props.id.user && props.id.server === 'c.us') {
                        foundPhone = props.id.user;
                        if (props.name) foundName = props.name;
                    }

                    const checkObj = (obj) => {
                        if (!obj || typeof obj !== 'object') return null;
                        if ((obj.server === 'c.us' || obj.server === 's.whatsapp.net') && obj.user && /^\d+$/.test(obj.user)) {
                            if (!foundName && (obj.name || obj.pushname)) foundName = obj.name || obj.pushname;
                            return obj.user;
                        }
                        if (obj.id && (obj.id.server === 'c.us' || obj.id.server === 's.whatsapp.net') && obj.id.user && /^\d+$/.test(obj.id.user)) {
                            if (!foundName && (obj.name || obj.pushname)) foundName = obj.name || obj.pushname;
                            return obj.id.user;
                        }
                        if (obj._serialized && typeof obj._serialized === 'string' && obj._serialized.includes('@')) {
                            let m = obj._serialized.match(/(\d{7,16})@(c\.us|s\.whatsapp\.net)/);
                            if (m) {
                                if (!foundName && (obj.name || obj.pushname)) foundName = obj.name || obj.pushname;
                                return m[1];
                            }
                        }
                        return null;
                    };
                    
                    if (!foundPhone) {
                        foundPhone = checkObj(props.contact) || checkObj(props.participant) || checkObj(props.chat) || checkObj(props.id) || checkObj(props.item) || checkObj(props.data) || checkObj(props.user);
                    }
                    
                    if (!foundPhone && typeof current.key === 'string' && current.key.includes('@')) {
                        let m = current.key.match(/(\d{7,16})@(c\.us|s\.whatsapp\.net)/);
                        if (m) foundPhone = m[1];
                    }
                }
                current = current.return;
                attempts++;
            }
        }
        
        const ignoreList = ["You", "Add member", "Search", "Search contacts", "Search members", "Invite to group via link", "Group settings", "Exit group", "Report group", "Messages", "Mute notifications", "Block", "Report", "Contact details"];

        // If we found the deep hidden phone number
        if (foundPhone) {
            if (!foundName) {
                let lines = (item.innerText || "").split('\n').map(l => l.trim()).filter(l => l);
                foundName = lines.length > 0 ? lines[0] : "Unknown";
            }
            if (!ignoreList.includes(foundName) && foundName !== "Unknown") {
                results.push({ name: foundName, phone: "+" + foundPhone });
            }
        } else {
            let lines = (item.innerText || "").split('\n').map(l => l.trim()).filter(l => l);
            if(lines.length > 0 && lines.length < 8) {
               let n = lines[0];
               let num = lines.find(x => /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\./0-9]*$/.test(x) && x.replace(/\D/g, '').length >= 7);
               
               if (!ignoreList.includes(n) && n !== "Unknown") {
                   if (num) {
                       results.push({name: n, phone: num});
                   } else {
                       results.push({name: n, phone: ""}); 
                   }
               }
            }
        }
    });
    
    document.dispatchEvent(new CustomEvent("WACS_Result", { detail: JSON.stringify(results) }));
});

document.addEventListener("WACS_Extract_Current", function() {
    let foundPhone = "";
    let foundName = "";
    
    // Find the main chat header
    const mainHeader = document.querySelector('#main header');
    if (mainHeader) {
        let fiber = null;
        for (let key in mainHeader) {
            if (key.startsWith('__reactFiber$')) {
                fiber = mainHeader[key];
                break;
            }
        }
        
        if (fiber) {
            let current = fiber;
            let attempts = 0;
            while (current && attempts < 15 && !foundPhone) {
                if (current.memoizedProps) {
                    let props = current.memoizedProps;
                    
                    const checkObj = (obj) => {
                        if (!obj || typeof obj !== 'object') return null;
                        if ((obj.server === 'c.us' || obj.server === 's.whatsapp.net') && obj.user && /^\d+$/.test(obj.user)) {
                            if (!foundName && (obj.name || obj.pushname)) foundName = obj.name || obj.pushname;
                            return obj.user;
                        }
                        if (obj.id && (obj.id.server === 'c.us' || obj.id.server === 's.whatsapp.net') && obj.id.user && /^\d+$/.test(obj.id.user)) {
                            if (!foundName && (obj.name || obj.pushname)) foundName = obj.name || obj.pushname;
                            return obj.id.user;
                        }
                        if (obj._serialized && typeof obj._serialized === 'string' && obj._serialized.includes('@')) {
                            let m = obj._serialized.match(/(\d{7,16})@(c\.us|s\.whatsapp\.net)/);
                            if (m) {
                                if (!foundName && (obj.name || obj.pushname)) foundName = obj.name || obj.pushname;
                                return m[1];
                            }
                        }
                        return null;
                    };
                    
                    foundPhone = checkObj(props.contact) || checkObj(props.participant) || checkObj(props.chat) || checkObj(props.id) || checkObj(props.item) || checkObj(props.data) || checkObj(props.user);
                    
                    if (!foundPhone && typeof current.key === 'string' && current.key.includes('@')) {
                        let m = current.key.match(/(\d{7,16})@(c\.us|s\.whatsapp\.net)/);
                        if (m) foundPhone = m[1];
                    }
                }
                current = current.return;
                attempts++;
            }
        }
    }
    
    document.dispatchEvent(new CustomEvent("WACS_Current_Result", { detail: JSON.stringify({ phone: foundPhone ? "+" + foundPhone : "", name: foundName }) }));
});
