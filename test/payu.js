const payu = require('../src/payu.js');
const express = require('express');
const chai = require('chai');
const db = require('../src/db.js');

const startServer = handler => {
  const app = express();
  app.use(express.json());
  const server = app.listen(9470);
  app.post('/', (req, res) => handler(req, res));
  return server;
}

describe('payu.js', () => {

  const event = 'bitcoin-pizza-day-2020';
  const user = '0x748c886A5aE916A08A493a29a5ff93880Ee000eD';
  const payment = {
    reference_sale: `${event}:${user}:2:development`,
    transaction_date: new Date().getTime(),
    value: '3.25',
    currency: 'USD',
    response_message_pol: 'REJECTED',
    error_message_bank: 'timeout ocurrido durante la transacción',
    state_pol: 4,
    sign: 'c4a19bd0c817fa265ad1671bf4377438c8efc69b6fbd39d8c60ca4f6c07d470b',
  };

  it('sleep', async () => {
    await payu.sleep(1232);
  });

  it('checkFee', () => {
    const values = [
      { expected: 10000000000000000, actual: 10000000000000000, result: true },
      { expected: 10000000000000000, actual: 9999999999999999, result: true },
      { expected: 10000000000000000, actual: 5000000000000000, result: false },
      { expected: 10000000000000000, actual: 10000000100000000, result: true },
    ];
    for (const value of values) {
      chai.assert.equal(value.result, payu.checkFee(value));
    }
  });

  it('setClosable', () => {
    payu.setClosable(payment.reference_sale);
  });

  it('getClosable', async () => {
    const closable = await payu.getClosable(payment.reference_sale);
    chai.assert.equal(closable, true);
    const notClosable = await payu.getClosable('aoeu');
    chai.assert.equal(notClosable, false);
  });

  it('getHashableAmount', () => {
    const amounts = {
      '25': '25',
      '25.2': '25.2',
      '25.25': '25.25',
      '25.20': '25.2',
      '25.00': '25.0',
    };
    for (const key in amounts) {
      const expected = amounts[key];
      const amount = key;
      chai.assert.equal(expected, payu.getHashableAmount(amount));
    }
  });

  it('awaitPullPayment', async () => {
    const handler = (req, res) => {
      const data = {
        result: {
          payload: [
            {
              creationDate: new Date().getTime(),
              additionalValues: {
                TX_VALUE: {
                  value: '3.25',
                  currency: 'COP'
                },
              },
              transactions: [
                {
                  transactionResponse: {
                    state: 'hey',
                    responseCode: 'blue'
                  },
                  extraParameters: {
                    URL_PAYMENT_RECEIPT_HTML: 'hello',
                  },
                },
              ],
            },
          ],
        },
      };
      res.json(data);
    }
    const server1 = startServer((req, res) => { handler(req, res); });
    const pull1 = await payu.awaitPullPayment(payment.reference_sale);
    chai.assert.equal(pull1.value, payment.value);
    server1.close();
    const server2 = startServer((req, res) => { res.json({ result: null }); });
    const pull2 = await payu.awaitPullPayment('aoeu');
    chai.assert.equal(null, pull2);
    server2.close();
  });

  it('pullPayment', async () => {
    const handler = (req, res) => {
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
    };
    const server = startServer(handler);
    await payu.pullPayment(payment.reference_sale);
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
