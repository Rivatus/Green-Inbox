async function Logout(e) {
    e.preventDefault();
    const id = e.target.id;
    $("#overlay").show();
    chrome.runtime.sendMessage(({ payload: 'Logout', accountId: id }));
}

chrome.storage.sync.get("Accounts", (accounts) => {
    if (accounts.Accounts) {
        const account = Object.entries(accounts.Accounts);
        for (var i in account) {
            console.log(account[i]);
            const aUser = $(`<div style="padding-bottom: 8px"><button id=${account[i][1]}>Logout from ${account[i][0]}</button><div>`);
            aUser.on("click", Logout);
            $("#LoggedInAccounts").append(aUser);
        }
    }
});

chrome.storage.sync.get("delay", (json) => {
    const delay = json.delay;
    if (!delay) $("#curDelay").append("Currently Messages are deleted after 43200 minutes(30 days)");
    else $("#curDelay").append("Currently Messages are deleted after " + delay + " minute" + (delay != 1 ? "s" : ""));
})

$("#Register").on("click", (e) => {
    e.preventDefault();
    $("#overlay").show();
    chrome.runtime.sendMessage(({ payload: "Register" }));
})

$("#LogoutAll").on("click", (e) => {
    e.preventDefault();
    $("#overlay").show();
    chrome.runtime.sendMessage({ payload: "SignoutAll" });
})


$("#changeDelay").on("click", (e) => {
    e.preventDefault();
    const delay = $("#delay").val();
    console.log(delay);
    if (delay > 5256000) alert("Cannot Delay for such large amount of time.");
    else if (delay <= 0) alert("Invalid time");
    else {
        chrome.runtime.sendMessage({ payload: "changeWaitTime", time: delay });
        $("#overlay").show();
    }
})

// Refresh a page, when background process finishes 

chrome.runtime.onMessage.addListener((message, sender, callback) => {
    location.reload();
});