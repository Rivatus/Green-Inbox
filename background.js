// First Part Handles the User Authentication Part. 


const REDIRECT_URL = "https://localhost:6547/";
const CLIENT_ID = "client id";
const SCOPES = ["openid", "email", "profile"];
const AUTH_URL =
    `https://accounts.google.com/o/oauth2/auth\
?client_id=${CLIENT_ID}\
&response_type=token\
&redirect_uri=${REDIRECT_URL}\
&scope=${encodeURIComponent(SCOPES.join(' '))}`;
const VALIDATION_BASE_URL = "https://www.googleapis.com/oauth2/v3/tokeninfo";


/*
 Used when user is logging in for the first time. 
*/
async function register(accountId, email, registerDetail) {
    chrome.identity.getAuthToken({ account: { id: accountId }, interactive: true }, function (token) {
        if (token) {
            chrome.storage.sync.set({ [email]: token });
            console.log(token);
            console.log(registerDetail);
            chrome.storage.sync.set({ "Accounts": registerDetail });
            chrome.tabs.query({ active: true, currentWindow: true }, function (tab) {
                chrome.tabs.sendMessage(tab[0].id, { reload: true });
            })
        }
    })
}

/*
When new access_token is required
*/
async function getToken(accountId, email) {
    chrome.identity.getAuthToken({ account: { id: accountId }, interactive: false }, function (token) {
        if (token) {
            chrome.storage.sync.set({ [email]: token });
            // console.log(token);
        } else {
            chrome.storage.sync.remove(email);
            removeAccount(accountId);
        }
        // chrome.identity.getAccounts((accounts) => console.log(accounts));
        // fetch(`https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${token}`)
        //     .then(res => res.json())
        //     .then((data) => {
        //         // console.log(data);
        //         const email = data.email;
        //         chrome.storage.sync.set({ [email]: token });
        //         // chrome.identity.getAccounts((accounts) => console.log(accounts));
        //     });
    });
}


/*
 Logouts a logged in user. 
 Pass Account as {id: accountId} 
*/
async function logout(Account, logoutOnce) {
    try {
        chrome.identity.getAuthToken({ account: Account, interactive: false }, (token) => {
            // console.log(Account.id);
            var url = 'https://accounts.google.com/o/oauth2/revoke?token=' + token;
            fetch(url);
            chrome.identity.removeCachedAuthToken({ token: token });
        });
        if (logoutOnce) removeAccount(Account.id, true);
    } catch (error) {
        throw error;
    }
}


async function removeAccount(id, refresh = false) {
    chrome.storage.sync.get("Accounts", (accounts) => {
        const newAccounts = {};
        const account = Object.entries(accounts.Accounts);
        // console.log(account);
        for (var i in account) account[i][1] !== id && (newAccounts[account[i][0]] = account[i][1]);
        // console.log(newAccounts);
        chrome.storage.sync.set({ "Accounts": newAccounts }, () => {
            if (refresh) {
                chrome.tabs.query({ active: true, currentWindow: true }, function (tab) {
                    chrome.tabs.sendMessage(tab[0].id, { reload: true });
                })
            }
        })
    })
}


function extractAccessToken(redirectUri) {
    let m = redirectUri.match(/[#?](.*)/);
    if (!m || m.length < 1)
        return null;
    let params = new URLSearchParams(m[1].split("#")[0]);
    return params.get("access_token");
}

/**
Validate the token contained in redirectURL.
This follows essentially the process here:
https://developers.google.com/identity/protocols/OAuth2UserAgent#tokeninfo-validation
- make a GET request to the validation URL, including the access token
- if the response is 200, and contains an "aud" property, and that property
matches the clientID, then the response is valid
- otherwise it is not valid
Note that the Google page talks about an "audience" property, but in fact
it seems to be "aud".
*/
function validate(redirectURL) {
    const accessToken = extractAccessToken(redirectURL);
    console.log(accessToken);
    if (!accessToken) {
        throw "Authorization failure";
    }
    const validationURL = `${VALIDATION_BASE_URL}?access_token=${accessToken}`;

    const validationRequest = new Request(validationURL, {
        method: "GET"
    });

    function checkResponse(response) {
        if (response.status != 200) {
            console.log(response);
            throw "Token validation error";
        }
        response.json().then((json) => {
            if (json.aud && (json.aud === CLIENT_ID)) {
                const email = json.email, accountId = json.sub;
                chrome.storage.sync.get("Accounts", (account) => {
                    const accounts = account.Accounts
                    if (!accounts || !accounts[email]) {
                        // console.log(accounts);
                        register(accountId, email, { ...accounts, [email]: accountId }, true);
                    }
                });
            }
            else {
                throw "Token validation error";
            }
        });
    }

    fetch(validationRequest).then(checkResponse);
}

/* 
Gives the tab which is currently active 
*/
async function getCurrentTab() {
    let queryOptions = { active: true, currentWindow: true };
    let [tab] = await chrome.tabs.query(queryOptions);
    return tab;
}

/*
User Chooses which google account they want to use for registering 
*/
async function authenticate(tabId, mainTab) {
    chrome.tabs.onUpdated.addListener(function listenUpdates(id, changeInfo, tab) {
        // console.log("Something happened at tab: " + id);
        if (id == tabId) {
            // console.log(changeInfo);
            if (changeInfo.url) {
                var ok = 1, url = changeInfo.url;
                for (let i = 0; i < REDIRECT_URL.length && ok; ++i) ok &= (REDIRECT_URL[i] == url[i]);
                if (ok) {
                    // console.log(url);
                    validate(url);
                    chrome.tabs.onUpdated.removeListener(listenUpdates);
                    chrome.tabs.remove(id);
                    chrome.tabs.highlight({ "tabs": mainTab });
                }
            }
        }
    });
}


/*
 Register a user, so that they can use this chrome extension. 
*/
async function userRegister() {
    const mainTab = await getCurrentTab();
    const tab = await chrome.tabs.create({ url: AUTH_URL });
    console.log(mainTab, tab);
    authenticate(tab.id, mainTab.index);
}

/* 
Returns a new access_token that can be used when the current token expires. 
*/
async function refreshToken(email) {
    chrome.storage.sync.get("Accounts", (accounts) => {
        const account = accounts.Accounts;
        const accountId = account[email];
        // console.log(accountId);
        if (accountId) getToken(accountId, email);
        else { console.log(email); throw "User Not found!!"; }
    })
}

/* 
Signs Out all signed in users at once 
*/
async function signOutAllUsers() {
    chrome.storage.sync.get("Accounts", (accounts) => {
        const account = Object.entries(accounts.Accounts);
        for (var i in account) {
            // console.log(account[i]);
            logout({ id: account[i][1] }, false);
        }
        chrome.storage.sync.set({ "Accounts": {} }, () => {
            chrome.tabs.query({ active: true, currentWindow: true }, function (tab) {
                chrome.tabs.sendMessage(tab[0].id, { reload: true });
            })
        })
    });
}


// Test First Part Here 


// signOutAllUsers();
// userRegister();
// getToken("102784046499183797054", "ak82@iitbbs.ac.in");



// Second Part - Handles user requests 

async function MessageHandler(message, sender, callback) {
    // console.log("Message: ", message);
    switch (message.payload) {
        case 'SetAlarm':
            setAlarm(message.email, message.messageId, message.byUser);
            break;
        case 'RemoveAlarm':
            removeAlarm(message.email, message.messageId, message.byUser);
            break;
        case 'RefreshToken':
            refreshToken(message.email);
            break;
        case 'Register':
            userRegister();
            break;
        case 'Logout':
            logout({ id: message.accountId }, true)
            break;
        case 'SignoutAll':
            signOutAllUsers()
            break;
        case 'changeWaitTime':
            changeDay(message.time);
            break;
    }
}


chrome.runtime.onMessage.addListener(MessageHandler);




// Third Part - Create Alarm and  Delete Email after alarm is triggered

/* States: 
 undefined - new_email, unread and unregistered. OR Alarm was removed as user read the message
 1 - User set the Alarm
 2 - User removed the Alarm 
 3 - Alarm was set as message was unread. 
*/


function changeDay(minutes) {
    console.log("Changing time");
    chrome.storage.sync.set({ "delay": minutes });
    chrome.tabs.query({ active: true, currentWindow: true }, function (tab) {
        chrome.tabs.sendMessage(tab[0].id, { reload: true });
    })
}


function setAlarm(gmail, messageId, byUser) {
    const alarmName = gmail + " " + messageId, messageName = gmail + messageId;
    chrome.storage.sync.get("delay", (json) => {
        const delay = parseInt(json.delay) || 43200;
        chrome.alarms.create(alarmName, { 'delayInMinutes': delay });
        console.log(delay);
    });
    chrome.storage.sync.set({ [messageName]: byUser ? 1 : 3 });
    // setInterval(() => {
    //     chrome.storage.sync.get(messageName, (res) => console.log(res));
    // }, 10000);
    // console.log("Done...");
}

function removeAlarm(gmail, messageId, byUser) {
    const alarmName = gmail + " " + messageId, messageName = gmail + messageId;
    chrome.alarms.clear(alarmName);
    if (byUser) chrome.storage.sync.set({ [messageName]: 2 });
    else chrome.storage.sync.remove(messageName);
    console.log("Done...");
}


chrome.alarms.onAlarm.addListener(deleteEmail);


async function deleteEmail(alarm) {
    const name = alarm.name;
    const [gmail, messageId] = name.split(' ');
    // console.log(gmail, messageId);
    chrome.storage.sync.get(gmail, (json) => {
        const token = json[gmail];
        let init = {
            method: 'POST',
            async: true,
            headers: {
                Authorization: 'Bearer ' + token,
                'Content-Type': 'application/json'
            },
            'contentType': 'json'
        };
        fetch(`https://gmail.googleapis.com/gmail/v1/users/${gmail}/threads/${messageId}/trash`, init)
            .then(res => {
                if (res.status == 401) {
                    refreshToken(gmail);
                    Dhoka(gmail, messageId);
                }
                if (res.status == 200) {
                    console.log("Success");
                    chrome.storage.sync.remove(gmail + messageId);
                }
            })
    });
}

function Dhoka(gmail, messageId) {
    function handleChange(changes, areaName) {
        if (changes[gmail]) {
            // console.log(changes);
            chrome.storage.onChanged.removeListener(handleChange);
            if (changes[gmail]["newValue"]) deleteEmail({ name: gmail + ' ' + messageId });
            else chrome.storage.sync.remove(gmail + messageId);
        }
    }

    chrome.storage.onChanged.addListener(handleChange);
}