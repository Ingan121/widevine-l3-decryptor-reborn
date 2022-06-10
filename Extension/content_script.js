injectScripts();

async function injectScripts() 
{
    await injectScript('lib/pbf.3.0.5.min.js');
    await injectScript('lib/cryptojs-aes_0.2.0.min.js');
    await injectScript('protobuf-generated/license_protocol.proto.js');

    
    await injectScript('content_key_decryption.js');
    await injectScript('eme_interception.js');
}

function injectScript(scriptName) 
{
    return new Promise(function(resolve, reject) 
    {
        var s = document.createElement('script');
        s.src = chrome.extension.getURL(scriptName);
        s.onload = function() {
            this.parentNode.removeChild(this);
            resolve(true);
        };
        (document.head||document.documentElement).appendChild(s);
    });
}

window.addEventListener("message", function(event) {
    // We only accept messages from ourselves
    if (event.source != window)
        return;

    if (event.data.kid && (event.data.kid.length == 32)) {
        chrome.runtime.sendMessage({ kid: event.data.kid }, decryptedKey => {
            if (decryptedKey == -1) console.log("WidevineDecryptor: An error occured! (KID=" + event.data.kid + ")");
            else console.log("WidevineDecryptor: Found key: " + decryptedKey + " (KID=" + event.data.kid + ")");
        });
    }

    if (event.data.pssh) {
        console.log('pssh: %s', event.data.pssh)
        chrome.runtime.sendMessage({ pssh: event.data.pssh });
    }

    if (event.data.reqData) {
        console.log('reqData length: %s', event.data.reqData.length)
        chrome.runtime.sendMessage({ reqData: event.data.reqData });
    }
});