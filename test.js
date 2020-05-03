const chai = require('chai');
const assert = chai.assert;
const fetch = require('node-fetch');
const Web3EthAccounts = require('web3-eth-accounts');

const url = 'http://localhost:3000';
const infuraKey = '58a2b59a8caa4c2e9834f8c3dd228b06';
const infuraUrl = `https://mainnet.infura.io/v3/${infuraKey}`;
const accounts = new Web3EthAccounts(infuraUrl);
const privateKey =
      'f08e62226ba4b59642fc7fb373c37991a08cb7bb4ec41287308616ca0758675f';
const fakePrivateKey = privateKey.replace('f', 'd');
const address = '0xF3B49Bf11bf5C73D11db4e7D2Fb0BCf13dc04CF6';
const name = 'Simón Bolívar';
const users = [
  {
      address: '0x9178f0254d4A2296C230560917325B95C88Bd76a',
      name: 'Francisco de Paula Santander'
  },
  {
      address: '0xD1F1B121D09AEdcd9bF5625b12472815AF14e8C3',
      name: 'Domingo Caycedo'
  },
  {
      address: '0x9F953eDA8084EAE05c8af1B78ADfadcd1aC6f9df',
      name: 'Joaquín Mosquera'
  }
];
const privateKeys = [
  'fc1bb76ab9d803236fbb6915a0c4e2505615a811b1b005faa9207ff2f22b26b5',
  '695e58fa6bd91c051d0080a30e3148240aaa1951d1a40b9cacd40aadd4e526e3',
  '6aa0113aa3bc0265cd20337a74aff8d3e04cdc45304c919b078ff600d53b24b9',
];
const claps = [2, 4, 3];

const verifyUser = data => {
  assert.ok(
    'name' in data
      && 'address' in data
      && 'date' in data
      && 'ip' in data
  );
  assert.equal(address, data.address);
  assert.equal(name, data.name);
}

const post = async (endpoint, object, privateKey) => {
  let signedObject = object;
  if (privateKey) {
    const result = accounts.sign(JSON.stringify(object), privateKey);
    const { signature } = result;
    signedObject = { signature, ...object };
  }
  const options = {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(signedObject)
  };
  return fetch(`${url}/${endpoint}`, options);
}

const verifyAssessment = (data, date) => {
  assert.ok(
    'sender' in data
      && 'assessment' in data
      && 'date' in data
      && 'ip' in data
  );
  assert.equal(address, data.sender);
  assert.closeTo(new Date(data.date).getTime(), date.getTime(), 10000);
  assert.ok(
    users[0].address in data.assessment
      && users[1].address in data.assessment
      && users[2].address in data.assessment
  );
  assert.ok(
    data.assessment[users[0].address] === claps[0]
      && data.assessment[users[1].address] === claps[1]
      && data.assessment[users[2].address] === claps[2]
  );
}

describe('GET /', () => {
  it('version is correct', async () => {
    const response = await fetch(`${url}/`);
    assert.ok(response.ok);
    const data = await response.json();
    assert.ok('version' in data);
    assert.equal('1.0.0', data.version);
  });
});

describe('POST /users', () => {
  it('succeeds', async () => {
    const object = { address, name };
    const response = await post('users', object, privateKey);
    const date = new Date();
    assert.ok(response.ok, response.status);
    const data = await response.json();
    verifyUser(data);
    assert.closeTo(new Date(data.date).getTime(), date.getTime(), 10000);
    await post('users', users[0], privateKeys[0]);
    await post('users', users[1], privateKeys[1]);
    await post('users', users[2], privateKeys[2]);
  });
  it('fails due to valid but different signature', async () => {
    const object = { address, name };
    const response = await post('users', object, fakePrivateKey);
    assert.isNotOk(response.ok);
    assert.equal(response.status, 401);
  });
  it('fails due to no signature', async () => {
    const object = { address, name };
    const response = await post('users', object, null);
    assert.isNotOk(response.ok);
    assert.equal(response.status, 400);
  });
  it('fails due to malformed signature', async () => {
    const object = { address, name, signature: 'hola' };
    const options = {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(object)
    }
    const response = await fetch(`${url}/users`, options);
    assert.isNotOk(response.ok);
    assert.equal(response.status, 400);
  });
  it('fails due to malformed signature of the same size', async () => {
    const object = { address, name, signature: 'h'.repeat(132) };
    const options = {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(object)
    }
    const response = await fetch(`${url}/users`, options);
    assert.isNotOk(response.ok);
    assert.equal(response.status, 400);
  });
  it('fails due to empty signature', async () => {
    const object = { address, name, signature: '' };
    const options = {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(object)
    }
    const response = await fetch(`${url}/users`, options);
    assert.isNotOk(response.ok);
    assert.equal(response.status, 400);
  });
});

describe('GET /user/:address', () => {
  it('succeeds', async () => {
    const response = await fetch(`${url}/user/${address}`);
    assert.ok(response.ok, response.status);
    const data = await response.json();
    verifyUser(data);
  });
});

describe('GET /users', () => {
  it('succeeds', async () => {
    const response = await fetch(`${url}/users`);
    assert.ok(response.ok);
    const data = await response.json();
    assert.equal(4, data.length);
    for (const i in data) {
      assert.ok(
        'name' in data[i]
          && 'address' in data[i]
          && 'date' in data[i]
          && 'ip' in data[i]
      );
    }
  });
});

describe('POST /assessments', () => {
  const assessment = {
    [users[0].address]: claps[0],
    [users[1].address]: claps[1],
    [users[2].address]: claps[2],
  };
  const object = {sender: address, assessment};
  it('succeeds', async () => {
    const response = await post('assessments', object, privateKey);
    const date = new Date();
    assert.ok(response.ok, response.status);
    const data = await response.json();
    verifyAssessment(data, date);
  });
  it('fails due to valid but different signature', async () => {
    const response = await post('assessments', object, fakePrivateKey);
    assert.isNotOk(response.ok);
    assert.equal(response.status, 401);
  });
  it('fails due to no signature', async () => {
    const response = await post('assessments', object, null);
    assert.isNotOk(response.ok);
    assert.equal(response.status, 400);
  });
  it('fails due to malformed signature', async () => {
    const signedObject = {...object, signature: 'hola'};
    const options = {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(signedObject)
    }
    const response = await fetch(`${url}/assessments`, options);
    assert.isNotOk(response.ok);
    assert.equal(response.status, 400);
  });
  it('fails due to malformed signature of the same size', async () => {
    const signedObject = {...object, signature: 'x'.repeat(132)};
    const options = {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(signedObject)
    }
    const response = await fetch(`${url}/assessments`, options);
    assert.isNotOk(response.ok);
    assert.equal(response.status, 400);
  });
  it('fails due to empty signature', async () => {
    const signedObject = { ...object, signature: '' };
    const options = {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(signedObject)
    }
    const response = await fetch(`${url}/assessments`, options);
    assert.isNotOk(response.ok);
    assert.equal(response.status, 400);
  });
});

describe('GET /assessment/:sender', () => {
  it('succeeds', async () => {
    const response = await fetch(`${url}/assessment/${address}`);
    const date = new Date();
    assert.ok(response.ok, response.status);
    const data = await response.json();
    verifyAssessment(data, date);
  });
});

describe('GET /assessments', () => {
  it('succeeds', async () => {
    const response = await fetch(`${url}/assessments`);
    const date = new Date();
    assert.ok(response.ok, response.status);
    const data = await response.json();
    assert.equal(1, data.length);
    verifyAssessment(data[0], date);
  });
});