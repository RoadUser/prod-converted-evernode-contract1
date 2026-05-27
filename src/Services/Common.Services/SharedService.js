class SharedService {
  static context = null;

  static getUtcISOStringFromUnixTimestamp(milliseconds) {
    const date = new Date(milliseconds);
    return date.toISOString();
  }
//sdsadsfd
  static getCurrentTimestamp() {
    if (!SharedService.context) return new Date().toISOString();
    return SharedService.getUtcISOStringFromUnixTimestamp(SharedService.context.timestamp);
  }

  static generateConcurrencyKey() {
    const timestamp = SharedService.getCurrentTimestamp();
    const extractedTimestamp = timestamp.replace(/\D/g, "");
    const timestampHex = Number(extractedTimestamp).toString(16).toUpperCase().padStart(14, "0");
    const checksum = 16 - timestampHex.length;
    return `0x${"0".repeat(checksum)}${timestampHex}`;
  }
}

module.exports = { SharedService };
