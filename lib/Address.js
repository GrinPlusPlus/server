const base32decode = require('base32-decode');

class Address {
    constructor(id) {
        const address = this.address = id;
    }

    get() { return this.address; }
}

function createAddress(id) {
    try {
        // TODO: Validate the version and checksum
        if (base32decode(id, 'RFC4648').byteLength == 35) {
            return new Address(id);
        }
    } catch (_) { }

    return null;
}

export { Address, createAddress };