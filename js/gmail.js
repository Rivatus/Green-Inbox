let gmail = "";
const imageUrl = chrome.runtime.getURL("./../icon/a.png");
const schedule_imageUrl = chrome.runtime.getURL("./../icon/b.png");


new WebKitMutationObserver(function (a, d) {
    const usefulText = $(".gb_Ma.gb_C.gb_h").attr("aria-label");
    if (!usefulText) return;
    for (let i = 0, start = 0; i < usefulText.length; ++i) {
        if (usefulText[i] == ')') start = 0;
        if (start) gmail += usefulText[i];
        if (usefulText[i] == '(') start = 1;
    }
    if (gmail.length) {
        this.disconnect();
        proceedIfAuthorized();
    }
}).observe(document, { subtree: !0, childList: !0, characterData: !1, attributes: !1 });


function proceedIfAuthorized() {
    chrome.storage.sync.get("Accounts", (accounts) => {
        const account = accounts.Accounts;
        if (account && account[gmail]) Authorized();
        else {
            console.log("Oh Ho, Perission denied, please login in Green Inbox using this email to use the feature.");
        }
    })
}

function Authorized() {
    new WebKitMutationObserver(function (a, d) {
        $(".yW:not(.gab)")
            .addClass("gab")
            .each(function () {
                var usefulDiv = $(this).parent().children()[0];
                var usefulSpan = $(usefulDiv).children();
                var messageId;
                for (var i = 0; i < usefulSpan.length; ++i) {
                    messageId = $(usefulSpan[i]).attr("data-legacy-thread-id");
                    if (messageId)
                        break;
                }

                var m = $("<td></td>").addClass("gabHorizontal xY");
                m.append(`<input type="image" class="scheduler" id=${messageId} data-tooltip="Schedule Deletion" src = ${imageUrl}></input>`)
                $(this).parent().prev().after(m);
                var isUnread = ($(this).parent().parent().attr("class").indexOf('zE') >= 0)
                m.on("click", handleClick);
                const uniqueUserMessageId = gmail + messageId;
                chrome.storage.sync.get(uniqueUserMessageId, (res) => {
                    const isthere = res[uniqueUserMessageId];
                    if (!isUnread && isthere == 3) removeScheduledDelete(messageId);
                    else if (isthere == 1 || isthere == 3) $("#" + messageId).attr("src", schedule_imageUrl);
                    else if (!isthere && isUnread) scheduledDelete(messageId);
                })
            });
    }).observe(document, { subtree: !0, childList: !0, characterData: !1, attributes: !1 });
}

async function handleClick(event) {
    event.stopPropagation();
    event.preventDefault();
    const messageId = event.target.id;
    // Check if the message is already scheduled 

    const uniqueUserMessageId = gmail + messageId;
    chrome.storage.sync.get(uniqueUserMessageId, (res) => {
        const isthere = res[uniqueUserMessageId];
        if (isthere == 1 || isthere == 3) removeScheduledDelete(messageId, true);
        else scheduledDelete(messageId, true);
    })
}


function scheduledDelete(messageId, byUser = false) {
    $("#" + messageId).attr("src", schedule_imageUrl);
    chrome.runtime.sendMessage({ payload: "SetAlarm", email: gmail, messageId: messageId, byUser: byUser });
}

function removeScheduledDelete(messageId, byUser = false) {
    $("#" + messageId).attr("src", imageUrl);
    chrome.runtime.sendMessage({ payload: "RemoveAlarm", email: gmail, messageId: messageId, byUser: byUser })
}
