#!/bin/sh

function cb_sigint()
{
  echo
  echo "Caught SIGINT."
  exit
}
function cb_sigterm()
{
  echo
  echo "Caught SIGTERM."
  exit
}
function cb_sigquit()
{
  echo
  echo "Caught SIGQUIT."
  exit
}
trap cb_sigint SIGINT
trap cb_sigterm SIGTERM
trap cb_sigquit SIGQUIT

# TODO(dkorolev): Not sure this should be as explicit as it is not, maybe some `/static` under `/html`?
cp /html/favicon.ico /eternal

cd /app
node server.js &
wait
