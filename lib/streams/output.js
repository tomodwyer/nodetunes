const { PassThrough } = require("readable-stream");
const BaseStream = require("./base");
const util = require("util");

function OutputStream() {
  PassThrough.call(this);

  this.baseStream = new BaseStream();
  this.decoder = null;
}

util.inherits(OutputStream, PassThrough);

OutputStream.prototype.setDecoder = function setDecoder(decoder) {
  this.decoder = decoder;
  this.baseStream.pipe(decoder).pipe(this);
};

OutputStream.prototype.add = function add(chunk, sequenceNumber) {
  this.baseStream.add(chunk, sequenceNumber);
};

module.exports = OutputStream;
