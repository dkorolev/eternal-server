#!/bin/bash

set -e

PARAMS=""

if [ "$1" == "-d" ] ; then
  PARAMS="--restart always"
  echo 'Running with `--restart always`.'
fi

[ -d html ] || ln -sf html_example html

(cd js; docker build .)

HTML_DIR="$PWD/html"
(cd js; docker run $PARAMS -it -p 9876:9876 -p 9877:9877 -v "$HTML_DIR":/html $(docker build -q .))
