#!/bin/bash

set -e

[ -d html ] || ln -sf html_example html

docker compose build
docker compose up $*
