const fetch = require('node-fetch');
const { youtube: {
  tokenEndpoint,
  clientID,
  clientSecret,
  refreshToken,
  broadcastEndpoint,
  streamEndpoint,
} } = require('./settings.js');

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
  const info = await bind(accessToken, broadcastID, streamID);
  console.log(info);
  return { broadcastID, streamName, };
}

module.exports = {
  getAccessToken,
  addBroadcast,
  addStream,
  bind,
  addLiveStream,
};
