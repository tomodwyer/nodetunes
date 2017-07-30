const Transform = require("readable-stream").Transform;
const util = require("util");

function PcmDecoderStream(...args) {
  Transform.apply(this, args);
}

util.inherits(PcmDecoderStream, Transform);

PcmDecoderStream.prototype.transform = function transform(pcmData, enc, cb) {
  const swapBuf = new Buffer(pcmData.length);

  // endian hack
  for (let i = 0; i < pcmData.length; i += 2) {
    swapBuf[i] = pcmData[i + 1];
    swapBuf[i + 1] = pcmData[i];
  }

  cb(null, swapBuf);
};

module.exports = PcmDecoderStream;
