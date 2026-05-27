const HotPocket = require('hotpocket-js-client');

class ContractService {
  constructor(servers, keyPair) {
    this.servers = servers;
    this.keyPair = keyPair;
    this.client = null;
    this.promiseMap = new Map();
  }

  async init() {
    this.client = await HotPocket.createClient(this.servers, this.keyPair);
    this.client.on(HotPocket.events.disconnect, () => { console.log('Disconnected'); });
    this.client.on(HotPocket.events.connectionChange, (server, action) => { console.log(server + ' ' + action); });
    this.client.on(HotPocket.events.contractOutput, (r) => {
      r.outputs.forEach((o) => {
        let output = o.toString();
        try { output = JSON.parse(output); } catch (e) {}
        const pid = output.promiseId;
        if (pid && this.promiseMap.has(pid)) {
          const pr = this.promiseMap.get(pid);
          if (output.error) pr.rejecter(output.error); else pr.resolver(output.success || output);
          this.promiseMap.delete(pid);
        }
      });
    });
    if (!await this.client.connect()) return false;
    return true;
  }

  submitInputToContract(payload) {
    const promiseId = Math.random().toString(16).slice(2);
    const data = JSON.stringify(Object.assign({ promiseId }, payload));
    this.client.submitContractInput(Buffer.from(data));
    return new Promise((resolve, reject) => this.promiseMap.set(promiseId, { resolver: resolve, rejecter: reject }));
  }

  async submitReadRequest(payload) {
    const out = await this.client.submitContractReadRequest(JSON.stringify(payload));
    try { return JSON.parse(out); } catch (e) { return out; }
  }
}

module.exports = ContractService;
