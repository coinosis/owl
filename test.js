const chai = require('chai');
const assert = chai.assert;
const fetch = require('node-fetch');
const Web3 = require('web3');

const url = 'http://localhost:5678';
const web3 = new Web3();
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

const MALFORMED_SIGNATURE = 'malformed-signature';
const UNAUTHORIZED = 'unauthorized';
const INSUFFICIENT_PARAMS = 'insufficient-params';
const WRONG_PARAM_VALUES = 'wrong-param-values';
const USER_NONEXISTENT = 'user-nonexistent';
const PAID_EVENT = 'paid-event';
const SERVICE_UNAVAILABLE = 'service-unavailable';
const NOT_FOUND = 'not-found';
const ADDRESS_EXISTS = 'address-exists';
const DISTRIBUTION_EXISTS = 'distribution-exists';
const EVENT_NONEXISTENT = 'event-nonexistent';
const DISTRIBUTION_NONEXISTENT = 'distribution-nonexistent';

const verifyUser = data => {
  assert.ok(
    'name' in data
      && 'address' in data
      && 'date' in data
      && 'signature' in data
  );
  assert.equal(address, data.address);
  assert.equal(name, data.name);
}

const post = async (endpoint, object, privateKey) => {
  let signedObject = object;
  if (privateKey) {
    const payload = JSON.stringify(object);
    const hex = web3.utils.utf8ToHex(payload);
    const result = web3.eth.accounts.sign(hex, privateKey);
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

describe('GET /', () => {
  it('server is up', async () => {
    const response = await fetch(`${url}/`);
    assert.ok(response.ok);
  });
});

describe('GET /eth/price', () => {
  it('succeeds', async () => {
    const response = await fetch(`${url}/eth/price`);
    assert.ok(response.ok);
    const data = await response.json();
    assert.ok(!isNaN(data));
  });
});

describe('GET /eth/gas', () => {
  it('succeeds', async () => {
    const response = await fetch(`${url}/eth/gas`);
    assert.ok(response.ok);
    const data = await response.json();
    assert.ok(!isNaN(data.safe));
    assert.ok(!isNaN(data.propose));
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
    assert.equal(response.status, 403);
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
    assert.equal(response.status, 401);
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
    assert.equal(response.status, 401);
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
      );
    }
  });
});

describe('PUT /user/:address', () => {
  it('succeeds', async () => {
    const object = {
      email: 'hola@ejemplo.com',
    };
    const payload = JSON.stringify(object);
    const hexPayload = web3.utils.utf8ToHex(payload);
    const { signature } = web3.eth.accounts.sign(hexPayload, privateKey);
    object.signature = signature;
    const options = {
      method: 'put',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(object)
    };
    const response = await fetch(`${url}/user/${address}`, options);
    assert.ok(response.ok);
  });
});

const event = {
  address: '0x0C0346f346cA57a087eD4B8f8a6F0473723657cD',
  name: 'Hack The Box Meetup: Colombia Sesión 2 (Virtual)',
  url: 'hack-the-box-meetup-colombia-sesion-2-virtual',
  description: `Cualquier persona interesada en comenzar y aprender sobre Hack The Box, hacking y pentesting es bienvenida a unirse al grupo. Compartimos conocimientos y hackeamos juntos.

En esta segunda sesión, realizaremos la explotación paso a paso de una máquina retirada de dificultad media, donde se aprenderemos sobre la técnica de inyección SQL y binarios setuid/setgid.

Prerrequisitos: tener instalado en una máquina virtual Kali Linux o Parrot Security. Recomendamos:

VirtualBox (https://www.virtualbox.org/wiki/Downloads)
Kali LInux (https://www.kali.org/downloads/).

NOTA: hemos visto la encuesta y estaremos mejorando basados en la informacion proporcionada. Nos estaremos adaptando y esperamos brindarles una mayor calidad en las charlas. Es por eso que les pedimos comprension para el desarrollo; por lo tanto, pondremos la charla inicialmente de 2 horas y si vemos la necesidad la extendemos un poco más.`,
  feeWei: 0,
  start: new Date('2021-05-12T19:00:00-05:00'),
  end: new Date('2021-05-12T21:00:00-05:00'),
  beforeStart: new Date('2019-05-12T18:50:00-05:00'),
  afterEnd: new Date('2021-05-12T21:30:00-05:00'),
  organizer: address,
};

const paidEvent = {...event}
paidEvent.address = '0xA1b19bCd50a24Be0CB399C1ec0f7ca546b94A2B0';
paidEvent.name = 'Paid Event';
paidEvent.url = 'paid-event';
paidEvent.feeWei = 20000000000000000;

const verifyEvent = (data, event) => {
  assert.ok(Object.keys(event).every(field => field in data));
  const dateFields = ['start', 'end', 'beforeStart', 'afterEnd'];
  for (const field in event) {
    if (dateFields.includes(field)) {
      assert.equal(new Date(data[field]).getTime(), event[field].getTime());
    }
    else {
      assert.equal(data[field], event[field]);
    }
  }
  const newFields = ['signature', 'creation'];
  assert.ok(newFields.every(field => field in data));
  assert.closeTo(
    new Date(data.creation).getTime(),
    new Date().getTime(),
    10000
  );
}

describe('POST /events', () => {

  it('succeeds', async () => {
    const response = await post('events', event, privateKey);
    assert.ok(response.ok, response.status);
    const data = await response.json();
    verifyEvent(data, event);
  });

  it('succeeds with paid event', async () => {
    const response = await post('events', paidEvent, privateKey);
    assert.ok(response.ok, response.status);
    const data = await response.json();
    verifyEvent(data, paidEvent);
  });

  it('fails due to valid but different signature', async () => {
    const response = await post('events', event, fakePrivateKey);
    assert.isNotOk(response.ok);
    assert.equal(response.status, 403);
  });
  it('fails due to no signature', async () => {
    const response = await post('events', event, null);
    assert.isNotOk(response.ok);
    assert.equal(response.status, 400);
  });
  it('fails due to malformed signature', async () => {
    const signedObject = {...event, signature: '0xaef03423'};
    const options = {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(signedObject)
    }
    const response = await fetch(`${url}/events`, options);
    assert.isNotOk(response.ok);
    assert.equal(response.status, 401);
  });
  it('fails due to malformed signature of the same size', async () => {
    const signedObject = {...event, signature: 'x'.repeat(132)};
    const options = {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(signedObject)
    }
    const response = await fetch(`${url}/events`, options);
    assert.isNotOk(response.ok);
    assert.equal(response.status, 400);
  });
  it('fails due to empty signature', async () => {
    const signedObject = { ...event, signature: '' };
    const options = {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(signedObject)
    }
    const response = await fetch(`${url}/events`, options);
    assert.isNotOk(response.ok);
    assert.equal(response.status, 400);
  });
});

describe('GET /events', () => {
  it('succeeds', async () => {
    const response = await fetch(`${url}/events`);
    assert.ok(response.ok, response.status);
    const data = await response.json();
    assert.equal(2, data.length);
    verifyEvent(data[0], event);
    verifyEvent(data[1], paidEvent);
  });
});

describe('GET /event/:eventURL', () => {
  it('succeeds', async () => {
    const response = await fetch(`${url}/event/${event.url}`);
    assert.ok(response.ok, response.status);
    const data = await response.json();
    verifyEvent(data, event);
  });
});

describe('PUT /distribution/event', () => {
  it('succeeds', async () => {
    const response = await fetch(
      `${url}/distribution/${event.url}`,
      { method: 'put' }
    );
    assert.ok(response.ok, response.status);
  });
  it('fails with distribution exists', async () => {
    const response = await fetch(
      `${url}/distribution/${event.url}`,
      { method: 'put' }
    );
    assert.isNotOk(response.ok, response.status);
    const message = await response.json();
    assert.equal(message, DISTRIBUTION_EXISTS);
  });
  it('fails with event nonexistent', async () => {
    const response = await fetch(
      `${url}/distribution/blah`,
      { method: 'put' }
    );
    assert.isNotOk(response.ok, response.status);
    const message = await response.json();
    assert.equal(message, EVENT_NONEXISTENT);
  });
});

describe('GET /distribution/event', () => {
  it('succeeds', async () => {
    const response = await fetch(`${url}/distribution/${event.url}`);
    assert.ok(response.ok);
    const data = await response.json();
    assert.equal(3, Object.keys(data).length);
    assert.ok(!isNaN(data.ethPrice));
  });
  it('fails with distribution nonexistent', async () => {
    const response = await fetch(`${url}/distribution/blah`);
    assert.isNotOk(response.ok);
    const data = await response.json();
    assert.equal(DISTRIBUTION_NONEXISTENT, data);
  });
});

const verifyAssessment = (data, date) => {
  assert.ok(
    'event' in data
      && 'sender' in data
      && 'assessment' in data
      && 'date' in data
      && 'signature' in data
  );
  assert.equal(event.url, data.event);
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

describe.skip('POST /assessments', () => {

  const assessment = {
    [users[0].address]: claps[0],
    [users[1].address]: claps[1],
    [users[2].address]: claps[2],
  };

  const object = {event: event.url, sender: address, assessment};

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
    assert.equal(response.status, 403);
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

describe.skip('GET /assessments/:event', () => {
  it('succeeds', async () => {
    const response = await fetch(`${url}/assessments/${event.url}`);
    const date = new Date();
    assert.ok(response.ok, response.status);
    const data = await response.json();
    assert.equal(1, data.length);
    verifyAssessment(data[0], date);
  });
});

describe.skip('GET /assessment/:event/:sender', () => {
  it('succeeds', async () => {
    const response = await fetch(`${url}/assessment/${event.url}/${address}`);
    const date = new Date();
    assert.ok(response.ok, response.status);
    const data = await response.json();
    verifyAssessment(data, date);
  });
});
