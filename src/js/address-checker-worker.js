importScripts('sjcl-bip39.js', 'wordlist_english.js', 'bitcoinjs-3.3.2.js', 'ethereumjs-util.js');

var mnemonic = new Mnemonic('english');
var cancelled = false;

self.onmessage = function(event) {
    var message = event.data;
    if (message.type === 'cancel') {
        cancelled = true;
        return;
    }
    if (message.type !== 'start') {
        return;
    }

    cancelled = false;
    var candidates = message.candidates || [];
    var target = (message.target || '').trim();
    var wordCount = message.wordCount || 'any';
    var results = [];
    var paths = message.paths || {
        btcLegacy: true,
        btcSegwit: true,
        btcBech32: true,
        eth: true
    };

    for (var i = 0; i < candidates.length; i++) {
        if (cancelled) {
            self.postMessage({ type: 'cancelled', checked: i, total: candidates.length });
            return;
        }

        var phrase = candidates[i].trim();
        if (!phrase) {
            continue;
        }

        var words = phrase.split(/\s+/);
        var result = { phrase: phrase, match: false, reason: '' };
        if ([12, 18, 24].indexOf(words.length) === -1 || (wordCount !== 'any' && words.length !== parseInt(wordCount, 10))) {
            result.reason = 'Only 12, 18, or 24 words are supported.';
        }
        else if (!mnemonic.check(phrase)) {
            result.reason = 'Not a valid BIP39 mnemonic.';
        }
        else {
            var found = compareAddresses(phrase, target, paths);
            result.match = found.length > 0;
            result.found = found;
            result.reason = result.match ? '' : 'No matching address found.';
        }

        results.push(result);
        self.postMessage({ type: 'result', result: result, checked: i + 1, total: candidates.length });
        self.postMessage({ type: 'progress', checked: i + 1, total: candidates.length });
    }

    self.postMessage({ type: 'done', checked: candidates.length, total: candidates.length });
};

function deriveAddresses(phrase, paths) {
    var seed = mnemonic.toSeed(phrase, '');
    var root = bitcoinjs.bitcoin.HDNode.fromSeedHex(seed, bitcoinjs.bitcoin.networks.bitcoin);
    var derivations = [];
    if (paths.btcLegacy) {
        derivations.push({ label: 'BTC Legacy', path: "m/44'/0'/0'/0/0", type: 'btc' });
    }
    if (paths.btcSegwit) {
        derivations.push({ label: 'BTC Segwit P2SH', path: "m/49'/0'/0'/0/0", type: 'btc' });
    }
    if (paths.btcBech32) {
        derivations.push({ label: 'BTC Bech32', path: "m/84'/0'/0'/0/0", type: 'btc' });
    }
    if (paths.eth) {
        derivations.push({ label: 'ETH', path: "m/44'/60'/0'/0/0", type: 'eth' });
    }

    return derivations.map(function(derivation) {
        return {
            label: derivation.label,
            path: derivation.path,
            address: deriveAddress(root, derivation.path, derivation.type)
        };
    });
}

function deriveAddress(root, path, type) {
    var parts = path.split('/').slice(1);
    var key = root;
    for (var i = 0; i < parts.length; i++) {
        var part = parts[i];
        var index = parseInt(part, 10);
        if (part.charAt(part.length - 1) === "'") {
            key = key.deriveHardened(index);
        }
        else {
            key = key.derive(index);
        }
    }

    if (type === 'eth') {
        return ethUtil.addHexPrefix(ethUtil.toChecksumAddress(ethUtil.privateToAddress(key.keyPair.d.toBuffer(32)).toString('hex')));
    }
    return key.keyPair.getAddress().toString();
}

function compareAddresses(phrase, target, paths) {
    var addresses = deriveAddresses(phrase, paths);
    var matches = [];
    for (var i = 0; i < addresses.length; i++) {
        var candidate = addresses[i].address;
        var equal = /^0x/i.test(target) ? candidate.toLowerCase() === target.toLowerCase() : candidate === target;
        if (equal) {
            matches.push(addresses[i].label + ' (' + addresses[i].path + ')');
        }
    }
    return matches;
}
