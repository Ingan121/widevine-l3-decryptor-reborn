var WidevineCrypto = {};

(function() {

WidevineCrypto.decryptContentKey = async function(licenseRequest, licenseResponse)
{
    licenseRequest = SignedMessage.read(new Pbf(licenseRequest));
    licenseResponse = SignedMessage.read(new Pbf(licenseResponse));

    if (licenseRequest.type != SignedMessage.MessageType.LICENSE_REQUEST.value) return;

    license = License.read(new Pbf(licenseResponse.msg));
    
    // iterate the keys we got to find those we want to decrypt (the content key(s))
    for (currentKey of license.key)
    {
        if (currentKey.type != License.KeyContainer.KeyType.CONTENT.value) continue;

        var keyId = currentKey.id;

        // finally decrypt the content key
        window.postMessage({kid: toHexString(keyId)}, "*");
    }

    return;
}

//
// Helper functions
//

const toHexString = bytes => bytes.reduce((str, byte) => str + byte.toString(16).padStart(2, '0'), '');

}());