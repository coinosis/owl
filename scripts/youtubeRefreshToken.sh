#! /bin/bash

# go to https://studio.youtube.com and activate your account for live streaming
# it takes 24 hours

# go to
# https://console.developers.google.com/apis/api/youtube.googleapis.com/overview
# and enable the YouTube Data API v3 for your account

# paste your OAuth 2.0 client ID and secret from
# https://console.developers.google.com/apis/credentials
YOUTUBE_CLIENT_ID=
YOUTUBE_CLIENT_SECRET=

echo "on your browser, go to the following URL:"
echo "https://accounts.google.com/o/oauth2/auth?client_id=${YOUTUBE_CLIENT_ID}\
&redirect_uri=https://testing-owl.herokuapp.com&response_type=code\
&scope=https://www.googleapis.com/auth/youtube&access_type=offline"
# authorize the app and, when redirected, take note of the code query parameter
# in the URL.
# paste it here:
CODE=
http post https://accounts.google.com/o/oauth2/token code=${CODE} \
     client_id=${YOUTUBE_CLIENT_ID} client_secret=${YOUTUBE_CLIENT_SECRET} \
     redirect_uri=https://testing-owl.herokuapp.com \
     grant_type=authorization_code --verbose

# take note of the refresh_token.
