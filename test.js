const chai = require('chai');
const assert = chai.assert;
const fetch = require('node-fetch');

const url = 'http://localhost:3000'

const post = async (endpoint, object) => {
  const options = {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(object)
  };
  return await fetch(`${url}/${endpoint}`, options);
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

const address = '0x0AEF7B88bF3bB98C1BB9C77d8780249f877E4AEc';
const name = 'Simón Bolívar';
const users = [
  {
      address: '0x73659C718EF0055CDe37E6178269E5B41D96771D',
      name: 'Francisco de Paula Santander'
  },
  {
      address: '0xc4031536F3cA6A4ED57c8274819D8499375f83b7',
      name: 'Domingo Caycedo'
  },
  {
      address: '0x635B4764D1939DfAcD3a8014726159abC277BecC',
      name: 'Joaquín Mosquera'
  }
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

describe('POST /users', () => {
  it('succeeds', async () => {
    const user = { address, name };
    const response = await post('users', user);
    const date = new Date();
    assert.ok(response.ok);
    const data = await response.json();
    verifyUser(data);
    assert.closeTo(new Date(data.date).getTime(), date.getTime(), 10000);
    await post('users', users[0]);
    await post('users', users[1]);
    await post('users', users[2]);
  });
});

describe('GET /user/:address', () => {
  it('succeeds', async () => {
    const response = await fetch(`${url}/user/${address}`);
    assert.ok(response.ok);
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

describe('POST /assessments', () => {
  it('succeeds', async () => {
    const assessment = {
      [users[0].address]: claps[0],
      [users[1].address]: claps[1],
      [users[2].address]: claps[2],
    }
    const response = await post('assessments', {assessment, sender: address});
    const date = new Date();
    assert.ok(response.ok);
    const data = await response.json();
    verifyAssessment(data, date);
  });
});

describe('GET /assessment/:sender', () => {
  it('succeeds', async () => {
    const response = await fetch(`${url}/assessment/${address}`);
    const date = new Date();
    assert.ok(response.ok);
    const data = await response.json();
    verifyAssessment(data, date);
  });
});

describe('GET /assessments', () => {
  it('succeeds', async () => {
    const response = await fetch(`${url}/assessments`);
    const date = new Date();
    assert.ok(response.ok);
    const data = await response.json();
    assert.equal(1, data.length);
    verifyAssessment(data[0], date);
  });
});
