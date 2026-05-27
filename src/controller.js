const { ServiceTypes } = require('./Constants/ServiceTypes');
const { HelloController } = require('./Controllers/Hello.Controller');
const { UpgradeController } = require('./Controllers/Upgrade.Controller');

class Controller {
  async handleRequest(ctx, user, message, isReadOnly) {
    let result = { error: { code: 404, message: 'Service not found' } };
    try {
      const svc = (message && (message.Service || message.service)) || '';
      switch (svc) {
        case ServiceTypes.HELLO:
          result = await new HelloController(message).handleRequest();
          break;
        case ServiceTypes.UPGRADE:
          result = await new UpgradeController(message, ctx, user).handleRequest();
          break;
        default:
          result = { error: { code: 404, message: 'Unknown service' } };
          break;
      }
    } catch (e) {
      result = { error: { code: 500, message: e && e.message ? e.message : 'Internal error' } };
    }

    await this.sendOutput(user, result);
  }

  async sendOutput(user, response) {
    try {
      await user.send(response);
    } catch (e) {
      // log error silently
    }
  }
}

module.exports = { Controller };
