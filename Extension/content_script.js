const s = document.createElement('script');
s.src = chrome.extension.getURL('eme_interception.js');
s.onload = function() {
    this.parentNode.removeChild(this);
};
(document.head||document.documentElement).appendChild(s);

window.addEventListener("message", function(event) {
    // We only accept messages from ourselves
    if (event.source != window)
        return;

    if (location.origin == 'https://www.netflix.com') {
        console.log('Sorry, Netflix is not supported.');
        return;
    }

    if (event.data.pssh) {
        chrome.runtime.sendMessage({ pssh: Array.apply(null, new Uint8Array(event.data.pssh)) });
    }

    if (event.data.reqData) {
        chrome.runtime.sendMessage({ reqData: Array.apply(null, new Uint8Array(event.data.reqData)) });
    }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("WidevineDecryptor: Found key: %s (KID=%s)", request.key, request.kid);
    sendResponse('OK');
});