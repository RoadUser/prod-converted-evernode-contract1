const { HelloService } = require('../Services/Domain.Services/Hello.Service');

class HelloController {
  constructor(message) {
    this.message = message;
    this.service = new HelloService(message);
  }

  async handleRequest() {
    try {
      switch ((this.message && (this.message.Action || this.message.action)) || '') {
        case 'GetMessage':
          return await this.service.getMessage();
        case 'SetMessage':
          return await this.service.setMessage();
        default:
          return { error: { message: 'Invalid action.' } };
      }
    } catch (err) {
      return { error: { message: err && err.message ? err.message : 'Error' } };
    }
  }
}

module.exports = { HelloController };
