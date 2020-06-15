const payu = require('../src/payu.js');
const chai = require('chai');
const db = require('../src/db.js');

describe('payu.js', () => {

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
