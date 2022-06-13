let pssh = '';
let licURL = '';
let headers = {};
let proxy = '';

let tabId = -1;
let reqData = '';
let xhrPackets = [];

chrome.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {
        console.log(request)

        if (request.pssh) {
            pssh = bytesToBase64(request.pssh);
            console.log('Received pssh: %s', pssh);
        } else if (request.reqData) {
            reqData = bytesToBase64(request.reqData);
            console.log('Received reqData (length: %s)', reqData.length);
            console.log(xhrPackets)
            for (let i = 0; i < xhrPackets.length; i++) {
                if (xhrPackets[i][2] == reqData.length &&
                    xhrPackets[i][1] == reqData.slice(0, 1000)) {
                    licURL = xhrPackets[i][0];
                    xhrPackets = [];
                    tabId = sender.tab.id;
                    console.log('Found license packet! URL is: %s (Sender tab ID: %i)', licURL, tabId);
                    break;
                }
            }
        }
        return true;
    }
);

chrome.webRequest.onBeforeRequest.addListener(
    (details) => {
        const bodyB64 = bytesToBase64(details.requestBody.raw[0].bytes);
        const data = [details.url, bodyB64.slice(0, 1000), bodyB64.length];
        xhrPackets[xhrPackets.length] = data;
        console.log(data);
    }, {urls: ["<all_urls>"], types: ["xmlhttprequest"]},
    ["requestBody"]
)

let extraInfoSpec = ["requestHeaders"]
if (typeof InstallTrigger === 'undefined') { // true if not Firefox - FF doesn't support extraHeaders
    extraInfoSpec[1] = "extraHeaders";
}

chrome.webRequest.onBeforeSendHeaders.addListener(
    (details) => {
        const headersArr = details.requestHeaders;
        let headersObj = {};
        for (let i = 0; i < headersArr.length; i++)
            headersObj[headersArr[i].name] = headersArr[i].value;
        setTimeout(() => {
            if (licURL == details.url) {
                headers = headersObj;
                console.log('Got headers!');
                startRequest();
            }
        }, 1000);

    }, {urls: ["<all_urls>"], types: ["xmlhttprequest"]},
    extraInfoSpec
)

function startRequest() {
    console.log(`Got everything needed! \n\nPSSH: ${pssh} \nLicense URL: ${licURL} \nHeaders: ${JSON.stringify(headers)} \nProxy: ${proxy ? proxy : 'None'} \nCache: True \n\nNow calling GWVK API...`);
    
    fetch("http://localhost:5352/api", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            pssh: pssh,
            license: licURL,
            headers: JSON.stringify(headers),
            cache: true
        })
    }).then(response => response.json()).then(response => {
        console.log(response);
        if (response.keys) {
            for (let i = 0; i < response.keys.length; i++) {
                const kid = response.keys[i].key.slice(0, 32), key = response.keys[i].key.slice(33);
                chrome.tabs.sendMessage(tabId, {kid, key}, response => {
                    licURL = '';
                    headers = {};
                    reqData = '';
                    xhrPackets = [];
                    console.log('Success!');
                });
            }
        }
    });
}

//
// Helper functions
//

const base64abc = [
	"A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M",
	"N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z",
	"a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m",
	"n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z",
	"0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "+", "/"
];

function bytesToBase64(arrbuf) {
       const bytes = new Uint8Array(arrbuf);
	let result = '', i, l = bytes.length;
	for (i = 2; i < l; i += 3) {
		result += base64abc[bytes[i - 2] >> 2];
		result += base64abc[((bytes[i - 2] & 0x03) << 4) | (bytes[i - 1] >> 4)];
		result += base64abc[((bytes[i - 1] & 0x0F) << 2) | (bytes[i] >> 6)];
		result += base64abc[bytes[i] & 0x3F];
	}
	if (i === l + 1) { // 1 octet yet to write
		result += base64abc[bytes[i - 2] >> 2];
		result += base64abc[(bytes[i - 2] & 0x03) << 4];
		result += "==";
	}
	if (i === l) { // 2 octets yet to write
		result += base64abc[bytes[i - 2] >> 2];
		result += base64abc[((bytes[i - 2] & 0x03) << 4) | (bytes[i - 1] >> 4)];
		result += base64abc[(bytes[i - 1] & 0x0F) << 2];
		result += "=";
	}
	return result;
}