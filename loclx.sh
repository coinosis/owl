#! /bin/bash

trap 'exit 130' INT

while true; do
    loclx tunnel http --to localhost:3000 --subdomain e18r
done
