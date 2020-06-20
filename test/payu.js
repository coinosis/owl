const payu = require('../src/payu.js');
const express = require('express');
const chai = require('chai');
const db = require('../src/db.js');

describe('payu.js', () => {

  const event = 'bitcoin-pizza-day-2020';
  const user = '0x748c886A5aE916A08A493a29a5ff93880Ee000eD';
  const payment = {
    reference_sale: `${event}:${user}:2:development`,
    transaction_date: new Date().getTime(),
    value: '3.25',
    currency: 'COP',
    response_message_pol: 'REJECTED',
    error_message_bank: 'timeout ocurrido durante la transacción',
    state_pol: 4,
    sign: '4539078c5e2170a53797fa26d5fddd44246ba9cb4200aea2705e2a3672b88c28',
  };

  it('paymentReceived', async () => {
    const req = {
      body: payment,
      connection: {
        remoteAddress: 'aoeu',
      },
      headers: 'aoeu',
    };
    await payu.paymentReceived(req);
  });

  it('pushPayment', async () => {
    const actualPayment = await payu.pushPayment(payment.reference_sale);
    chai.assert.equal(
      actualPayment.requestDate.getTime(),
      payment.transaction_date
    );
    chai.assert.equal(actualPayment.value, payment.value);
    chai.assert.equal(actualPayment.currency, payment.currency);
    chai.assert.equal(actualPayment.status, payment.response_message_pol);
    chai.assert.equal(actualPayment.error, payment.error_message_bank);
  });

  it('pullPayment', async () => {
    const app = express();
    app.use(express.json());
    const server = app.listen(9470);
    app.post('/', (req, res) => {
      chai.assert.equal(req.headers['content-type'], 'application/json');
      chai.assert.equal(req.headers.accept, 'application/json');
      const {
        test,
        command,
        merchant: { apiLogin, apiKey },
        details: { referenceCode },
        language,
      } = req.body;
      chai.assert.equal(test, true);
      chai.assert.equal(command, 'ORDER_DETAIL_BY_REFERENCE_CODE');
      chai.assert.equal(apiLogin, 'pRRXKOl8ikMmt9u');
      chai.assert.equal(apiKey, '4Vj8eK4rloUd272L48hsrarnUA');
      chai.assert.equal(referenceCode, payment.reference_sale);
      chai.assert.equal(language, 'es');
      res.json({ result: null });
    });
    const result = await payu.pullPayment(payment.reference_sale);
    server.close();
  });

  it('getHash', async () => {
    const event = 'comunicaciones-seguras';
    const user = '0xE16dF61224926Bac2724b58FC0BC49BdF7019751';
    const referenceCode = `${event}:${user}:1:testing`;
    const amount = '23.12';
    const currency = 'USD';
    const hash1 = await payu.getHash({ referenceCode, amount, currency });
    const expected1 =
          '7140049ab958d91dddfa704b06c6e24860098a2a6f103418b4fe44e5fbaae15d';
    chai.assert.equal(hash1, expected1);
    const state = 4;
    const hash2 = await payu.getHash({
      referenceCode,
      amount,
      currency,
      state,
    });
    const expected2 =
          'f97b1002f5270dd7565c6f6859b673946d3394487735a0d795b2807cd09678fe';
    chai.assert.equal(hash2, expected2);
  });

  after(async () => {
    db.disconnect();
  });

});
