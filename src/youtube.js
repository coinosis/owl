const fetch = require('node-fetch');
const { youtube: {
  tokenEndpoint,
  clientID,
  clientSecret,
  refreshToken,
  broadcastEndpoint,
  streamEndpoint,
} } = require('./settings.js');
const { sleep } = require('./control.js');

const getAccessToken = async () => {
  const response = await fetch(tokenEndpoint, {
    method: 'post',
    body: JSON.stringify({
      client_id: clientID,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  const data = await response.json();
  if (data.error) console.log(data.error);
  const { access_token: accessToken, } = data;
  return accessToken;
}

const addBroadcast = async (
  accessToken,
  title,
  description,
  scheduledStartTime,
  scheduledEndTime,
  privacyStatus
) => {
  const query = `${broadcastEndpoint}?part=snippet,status,contentDetails`;
  const validDescription = description.replace(/[<>]/g, '');
  const response = await fetch(query, {
    method: 'post',
    headers: { Authorization: `Bearer ${accessToken}`, },
    body: JSON.stringify({
      snippet: {
        title,
        description: validDescription,
        scheduledStartTime,
        scheduledEndTime,
      },
      status: { privacyStatus, selfDeclaredMadeForKids: false, },
      contentDetails: {
        enableAutoStart: true,
        enableAutoStop: true,
      },
    }),
  });
  const data = await response.json();
  if (data.error) console.log(data.error);
  const { id: broadcastID, } = data;
  return { broadcastID, };
}

const addStream = async (accessToken, title) => {
  const query = `${streamEndpoint}?part=snippet,cdn`;
  const response = await fetch(query, {
    method: 'post',
    headers: { Authorization: `Bearer ${accessToken}`, },
    body: JSON.stringify({
      snippet: {
        title,
      },
      cdn: {
        frameRate: 'variable',
        ingestionType: 'rtmp',
        resolution: 'variable',
      },
    }),
  });
  const data = await response.json();
  if (data.error) console.log(data.error);
  const { id: streamID, cdn: { ingestionInfo: { streamName } } } = data;
  return { streamID, streamName, };
}

const bind = async (accessToken, broadcastID, streamID) => {
  const query = `${ broadcastEndpoint }/bind`
        + `?part=id,snippet,contentDetails,status`
        + `&id=${ broadcastID }`
        + `&streamId=${ streamID }`;
  const response = await fetch(query, {
    method: 'post',
    headers: { Authorization: `Bearer ${ accessToken }`, },
  });
  const data = await response.json();
  if (data.error) console.log(data.error);
  return data;
}

const addLiveStream = async (
  title,
  description,
  scheduledStartTime,
  scheduledEndTime,
  privacyStatus
) => {
  if (!clientID || !clientSecret || !refreshToken) return {
    broadcastID: null,
    streamName: null,
  };
  const accessToken = await getAccessToken();
  const { broadcastID } = await addBroadcast(
    accessToken,
    title,
    description,
    scheduledStartTime,
    scheduledEndTime,
    privacyStatus
  );
  const { streamID, streamName } = await addStream(accessToken, title);
  await bind(accessToken, broadcastID, streamID);
  const afterEnd = new Date(scheduledEndTime).getTime();
  const longAfterEnd = afterEnd + 60000;
  const now = new Date().getTime();
  const timeLeft = longAfterEnd - now;
  setTimeout(() => enableEmbed(broadcastID), timeLeft);
  return { broadcastID, streamID, streamName, };
}

const getStreamStatus = async streamID => {
  const accessToken = await getAccessToken();
  const query = `${ streamEndpoint }?part=status&id=${ streamID }`;
  const response = await fetch(query, {
    method: 'get',
    headers: { Authorization: `Bearer ${ accessToken }`, },
  });
  const data = await response.json();
  const { streamStatus } = data.items[0].status;
  return streamStatus;
}

const enableEmbed = async broadcastID => {
  const accessToken = await getAccessToken();
  const query = `${ broadcastEndpoint }?part=contentDetails`;
  while (true) {
    const response = await fetch(query, {
      method: 'put',
      headers: { Authorization: `Bearer ${ accessToken }` },
      body: JSON.stringify({
        id: broadcastID,
        contentDetails: {
          enableEmbed: true,
          enableDvr: true,
          recordFromStart: true,
          enableContentEncryption: false,
          startWithSlate: false,
          monitorStream: {
            enableMonitorStream: true,
            broadcastStreamDelayMs: 0,
          },
        },
      }),
    });
    const data = await response.json();
    console.log(data);
    if ('id' in data) break;
    await sleep(10000);
  }
}

module.exports = {
  getAccessToken,
  addBroadcast,
  addStream,
  bind,
  addLiveStream,
  getStreamStatus,
};
