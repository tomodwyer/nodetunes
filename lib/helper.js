const forge = require("node-forge");

const fs = require("fs");
const crypto = require("crypto");
let debug = require("debug")("nodetunes:helper");

const parseSdp = function parseSdp(msg) {
  const multi = ["a", "p", "b"];

  const lines = msg.split("\r\n");
  const output = {};
  for (let i = 0; i < lines.length; i += 1) {
    const sp = lines[i].split(/=(.+)?/);
    if (sp.length === 3) {
      // for some reason there's an empty item?
      if (multi.indexOf(sp[0]) !== -1) {
        // some attributes are multiline...
        if (!output[sp[0]]) output[sp[0]] = [];

        output[sp[0]].push(sp[1]);
      } else {
        output[sp[0]] = sp[1]; // eslint-disable-line prefer-destructuring
      }
    }
  }

  return output;
};

const dmapTypes = {
  mper: 8,
  asal: "str",
  asar: "str",
  ascp: "str",
  asgn: "str",
  minm: "str",
  astn: 2,
  asdk: 1,
  caps: 1,
  astm: 4
};

const parseDmap = function parseDmap(buffer) {
  const output = {};

  for (let i = 8; i < buffer.length; ) {
    const itemType = buffer.slice(i, i + 4);
    const itemLength = buffer.slice(i + 4, i + 8).readUInt32BE(0);
    if (itemLength !== 0) {
      const data = buffer.slice(i + 8, i + 8 + itemLength);
      if (dmapTypes[itemType] === "str") {
        output[itemType.toString()] = data.toString();
      } else if (dmapTypes[itemType] === 1) {
        output[itemType.toString()] = data.readUInt8(0);
      } else if (dmapTypes[itemType] === 2) {
        output[itemType.toString()] = data.readUInt16BE(0);
      } else if (dmapTypes[itemType] === 4) {
        output[itemType.toString()] = data.readUInt32BE(0);
      } else if (dmapTypes[itemType] === 8) {
        output[itemType.toString()] =
          (data.readUInt32BE(0) < 8) + data.readUInt32BE(4);
      }
    }

    i += 8 + itemLength;
  }

  return output;
};

const getPrivateKey = function getPrivateKey() {
  const keyFile = fs.readFileSync(`${__dirname}/../private.key`);
  const privkey = forge.pki.privateKeyFromPem(keyFile);

  return privkey;
};

const privateKey = getPrivateKey();

const generateAppleResponse = function generateAppleResponse(
  challengeBuf,
  ipAddr,
  macAddr
) {
  // HACK: need to reload debug here (https://github.com/visionmedia/debug/issues/150)
  debug = require("debug")("nodetunes:helper"); // eslint-disable-line global-require
  debug(
    "building challenge for %s (ip: %s, mac: %s)",
    challengeBuf.toString("base64"),
    ipAddr.toString("hex"),
    macAddr.toString("hex")
  );

  let fullChallenge = Buffer.concat([challengeBuf, ipAddr, macAddr]);

  // im sure there's an easier way to pad this buffer
  const padding = [];
  for (let i = fullChallenge.length; i < 32; i += 1) {
    padding.push(0);
  }

  fullChallenge = Buffer.concat([fullChallenge, Buffer.from(padding)]).toString(
    "binary"
  );
  const response = forge.pki.rsa.encrypt(fullChallenge, privateKey, 0x01);
  debug("computed challenge: %s", forge.util.encode64(response));

  return forge.util.encode64(response);
};

const generateRfc2617Response = function generateRfc2617Response(
  username,
  realm,
  password,
  nonce,
  uri,
  method
) {
  const md5 = function md5(content) {
    return crypto
      .createHash("md5")
      .update(content)
      .digest()
      .toString("hex");
  };

  const ha1 = md5(`${username}:${realm}:${password}`);
  const ha2 = md5(`${method}:${uri}`);
  const response = md5(`${ha1}:${nonce}:${ha2}`);

  return response;
};

const getDecoderOptions = function getDecoderOptions(audioOptions) {
  if (!audioOptions) return {};
  const decoderOptions = {
    frameLength: parseInt(audioOptions[1], 10),
    compatibleVersion: parseInt(audioOptions[2], 10),
    bitDepth: parseInt(audioOptions[3], 10),
    pb: parseInt(audioOptions[4], 10),
    mb: parseInt(audioOptions[5], 10),
    kb: parseInt(audioOptions[6], 10),
    channels: parseInt(audioOptions[7], 10),
    maxRun: parseInt(audioOptions[8], 10),
    maxFrameBytes: parseInt(audioOptions[9], 10),
    avgBitRate: parseInt(audioOptions[10], 10),
    sampleRate: parseInt(audioOptions[11], 10)
  };

  return decoderOptions;
};

const decryptAudioData = function decryptAudioData(
  data,
  audioAesKey,
  audioAesIv,
  headSize
) {
  const tmp = Buffer.alloc(16);
  let headerSize = headSize;
  if (!headerSize) headerSize = 12;

  const remainder = (data.length - 12) % 16;
  const endOfEncodedData = data.length - remainder;

  const audioAesKeyBuffer = Buffer.from(audioAesKey, "binary");
  const decipher = crypto.createDecipheriv(
    "aes-128-cbc",
    audioAesKeyBuffer,
    audioAesIv
  );
  decipher.setAutoPadding(false);

  for (let i = headerSize, l = endOfEncodedData - 16; i <= l; i += 16) {
    data.copy(tmp, 0, i, i + 16);
    decipher.update(tmp).copy(data, i, 0, 16);
  }

  return data.slice(headerSize);
};

module.exports.decryptAudioData = decryptAudioData;
module.exports.getDecoderOptions = getDecoderOptions;
module.exports.parseSdp = parseSdp;
module.exports.parseDmap = parseDmap;
module.exports.generateAppleResponse = generateAppleResponse;
module.exports.generateRfc2617Response = generateRfc2617Response;
module.exports.rsaPrivateKey = privateKey;
