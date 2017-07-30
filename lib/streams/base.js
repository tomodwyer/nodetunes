const Readable = require("readable-stream").Readable;
const PriorityQueue = require("priorityqueuejs");
const util = require("util");

function BaseDecoderStream() {
  Readable.call(this);

  this.isFlowing = true;
  this.bufferQueue = new PriorityQueue(
    (a, b) => b.sequenceNumber - a.sequenceNumber
  );
}

util.inherits(BaseDecoderStream, Readable);

BaseDecoderStream.prototype.add = function add(chunk, sequenceNumber) {
  this._push({ chunk, sequenceNumber });
};

BaseDecoderStream.prototype._push = function push(data) {
  if (this.isFlowing) {
    const result = this.push(data.chunk);
    if (!result) {
      this.isFlowing = false;
    }
    return result;
  }
  return this.bufferQueue.enq(data);
};

BaseDecoderStream.prototype._read = function read() {
  this.isFlowing = true;
  if (this.bufferQueue.size() === 0) return;
  while (this.bufferQueue.size() > 0) {
    if (!this._push(this.bufferQueue.deq())) return;
  }
};

module.exports = BaseDecoderStream;
