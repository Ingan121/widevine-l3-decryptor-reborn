let pssh = '';
let licURL = '';
let headers = {};
let proxy = '';

let reqData = '';
let xhrPackets = [];

chrome.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {
        console.log(request)

        if (sender.origin == 'https://www.netflix.com') {
            const formData = new FormData();
            formData.append('cmd', 'download');
            formData.append('table', 'netflix_keys');
            formData.append('kid', request.kid);
            formData.append('ver', '3');
            
            fetch('https://drm-u1.dvdfab.cn/ak/re/netflix/', {
                method: 'POST',
                body: formData
            })
                .then(response => response.json())
                .then(responseJson => sendResponse(responseJson.R == "0" ? responseJson.key.match(`${request.kid}:(.{32})`)[1] : -1));
        } else if (request.pssh) {
            pssh = request.pssh;
            console.log('Received pssh: %s', pssh);
        } else if (request.reqData) {
            reqData = request.reqData;
            console.log('Received reqData (length: %s)', reqData.length);
            console.log(xhrPackets)
            for (let i = 0; i < xhrPackets.length; i++) {
                if (xhrPackets[i][2] == reqData.length &&
                    xhrPackets[i][1] == reqData.slice(0, 1000)) {
                    licURL = xhrPackets[i][0];
                    xhrPackets = [];
                    console.log('Found license packet! URL is: %s', licURL);
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
    ["requestBody"],
)

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
    ["requestHeaders", "extraHeaders"],
)

function startRequest() {
    console.log(`Got everything required! \n\n  PSSH: ${pssh} \n  License URL: ${licURL} \n  Headers: ${headers} \n  Proxy: ${proxy} \n  Cache: True \n\nNow calling GWVK API...`);
    
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
        console.log(response.keys);
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