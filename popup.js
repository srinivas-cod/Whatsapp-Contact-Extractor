document.addEventListener(
    "DOMContentLoaded",
    () => {

        const contactNameElement =
            document.getElementById(
                "contactName"
            );

        const saveButton =
            document.getElementById(
                "saveContact"
            );

        const noteInput =
            document.getElementById(
                "noteInput"
            );

        const exportButton =
            document.getElementById(
                "exportCSV"
            );

        const contactList =
            document.getElementById(
                "savedContacts"
            );

        const autoScrapeButton =
            document.getElementById(
                "autoScrape"
            );
            
        const autoScrapeStatus =
            document.getElementById(
                "autoScrapeStatus"
            );

        let currentContact = "";

        function loadContacts() {

            chrome.storage.local.get(
                ["contacts"],
                (result) => {

                    const contacts =
                        result.contacts || [];

                    contactList.innerHTML = "";

                    contacts.forEach(
                        (contact) => {

                            const li =
                                document.createElement(
                                    "li"
                                );

                            li.innerHTML =
                                "<strong>" +
                                contact.name +
                                "</strong><span class=\"note-text\">" +
                                (contact.note ||
                                    "No notes") +
                                "</span>";

                            contactList.appendChild(
                                li
                            );
                        }
                    );
                }
            );
        }

        chrome.tabs.query(
            {
                active: true,
                currentWindow: true
            },
            (tabs) => {

                chrome.tabs.sendMessage(
                    tabs[0].id,
                    {
                        action:
                            "getContact"
                    },
                    (response) => {

                        if (
                            response &&
                            response.contact
                        ) {

                            currentContact =
                                response.contact;
                                
                            window.currentContactData = response;

                            contactNameElement.textContent =
                                currentContact;

                        } else {

                            contactNameElement.textContent =
                                "No Contact Found";
                        }
                    }
                );
            }
        );

        saveButton.addEventListener(
            "click",
            () => {

                if (
                    !currentContact ||
                    currentContact ===
                        "No Contact Found"
                ) {

                    alert(
                        "Open a WhatsApp chat first"
                    );

                    return;
                }

                const note =
                    noteInput.value.trim();

                chrome.storage.local.get(
                    ["contacts"],
                    (result) => {

                        const contacts =
                            result.contacts || [];
                            
                        let finalName = currentContact;
                        let finalPhone = "";
                        
                        if (window.currentContactData) {
                            if (window.currentContactData.name && window.currentContactData.name !== "Unknown") {
                                finalName = window.currentContactData.name;
                            }
                            if (window.currentContactData.phone) {
                                finalPhone = window.currentContactData.phone;
                            }
                        }

                        const exists = contacts.some(c => 
                            (c.phone && finalPhone && c.phone === finalPhone) || 
                            (!finalPhone && c.name === finalName) ||
                            (c.name === currentContact)
                        );

                        if (exists) {

                            alert(
                                "Contact already saved"
                            );

                            return;
                        }

                        contacts.push({
                            name: finalName,
                            phone: finalPhone,
                            note: note
                        });

                        chrome.storage.local.set(
                            {
                                contacts:
                                    contacts
                            },
                            () => {

                                noteInput.value =
                                    "";

                                loadContacts();
                            }
                        );
                    }
                );
            }
        );

        autoScrapeButton.addEventListener("click", () => {
            autoScrapeButton.textContent = "Scrolling... Please wait";
            autoScrapeButton.style.opacity = "0.7";
            autoScrapeButton.disabled = true;
            if (autoScrapeStatus) autoScrapeStatus.textContent = "(Do not touch the page)";

            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                chrome.tabs.sendMessage(tabs[0].id, { action: "autoScrapeGroup" }, (response) => {
                    autoScrapeButton.textContent = "Auto-Extract All Members";
                    autoScrapeButton.style.opacity = "1";
                    autoScrapeButton.disabled = false;
                    
                    if (chrome.runtime.lastError) {
                        alert("Error connecting to WhatsApp page. Reload the page and try again.");
                        if (autoScrapeStatus) autoScrapeStatus.textContent = "(Connection error)";
                        return;
                    }
                    if (response && response.error) {
                        alert(response.error);
                        if (autoScrapeStatus) autoScrapeStatus.textContent = "(Error: List not found)";
                    } else if (response && response.success) {
                        if (autoScrapeStatus) autoScrapeStatus.textContent = "(Scraping complete!)";
                        
                        const extractedMembers = response.members || [];
                        const groupName = response.groupName || "Extracted Group";
                        
                        if (extractedMembers.length === 0) {
                            alert("No members found. Please ensure you have the 'Search members' modal open.");
                            return;
                        }

                        // Auto-save the members directly to storage
                        chrome.storage.local.get(["contacts"], (result) => {
                            const contacts = result.contacts || [];
                            let addedCount = 0;

                            extractedMembers.forEach(member => {
                                const exists = contacts.some(c => 
                                    (c.phone && member.phone && c.phone === member.phone) || 
                                    (!member.phone && c.name === member.name)
                                );
                                if (!exists) {
                                    // Assign the automatically detected group tag!
                                    member.note = groupName;
                                    contacts.push(member);
                                    addedCount++;
                                }
                            });

                            if (addedCount > 0) {
                                chrome.storage.local.set({ contacts: contacts }, () => {
                                    alert(`Successfully extracted and saved ${addedCount} new members with tag: "${groupName}".`);
                                    loadContacts();
                                });
                            } else {
                                alert(`Extracted ${extractedMembers.length} members, but they are all already saved!`);
                            }
                        });
                    }
                });
            });
        });

        const clearAllContactsButton = document.getElementById("clearAllContacts");
        if (clearAllContactsButton) {
            clearAllContactsButton.addEventListener("click", () => {
                if (confirm("Are you sure you want to clear ALL saved contacts? This cannot be undone.")) {
                    chrome.storage.local.set({ contacts: [] }, () => {
                        loadContacts();
                    });
                }
            });
        }

        exportButton.addEventListener(
            "click",
            () => {

                chrome.storage.local.get(
                    ["contacts"],
                    (result) => {

                        const contacts =
                            result.contacts || [];

                        let csv = "Name,Phone,Tag\n";

                        contacts.forEach(contact => {
                            const safeName = contact.name ? contact.name.replace(/"/g, '""') : "";
                            const safePhone = contact.phone ? String(contact.phone).replace(/"/g, '""') : "";
                            const safeNote = contact.note ? contact.note.replace(/"/g, '""') : "";
                            csv += `"${safeName}","${safePhone}","${safeNote}"\n`;
                        });

                        const blob =
                            new Blob(
                                [csv],
                                {
                                    type:
                                        "text/csv"
                                }
                            );

                        const url =
                            URL.createObjectURL(
                                blob
                            );

                        const a =
                            document.createElement(
                                "a"
                            );

                        a.href = url;

                        a.download =
                            "contacts.csv";

                        a.click();

                        URL.revokeObjectURL(
                            url
                        );
                    }
                );
            }
        );

        loadContacts();
    }
);