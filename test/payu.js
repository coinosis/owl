const payu = require('../src/payu.js');
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
  };

  it('paymentReceived', async () => {
    const req = {
      body: payment,
      connection: {
        remoteAddress: 'aoeu',
      },
      headers: 'aoeu',
    };
    payu.paymentReceived(req);
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

  it('getHash', async () => {
    const event = 'comunicaciones-seguras';
    const user = '0xE16dF61224926Bac2724b58FC0BC49BdF7019751';
    const req = {
      body: {
        merchantId: '123456',
        referenceCode: `${event}:${user}:1:testing`,
        amount: '23.12',
        currency: 'USD',
      },
    };
    const hash = await payu.getHash(req);
    const expected =
          '52a4902bf5994be25a1fe63ab50ddc52a1e83c4e5b3295985fda95a08c84ce6c';
    chai.assert.equal(hash, expected);
  });

  after(async () => {
    db.disconnect();
  });

});
