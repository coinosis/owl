#! /bin/bash

development=mongodb://localhost/coinosis

mongo ${development} scripts/deleteAll.js &&
mongorestore -d coinosis backup/test/heroku_7m49q4bs
