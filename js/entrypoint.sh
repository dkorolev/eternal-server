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
cp /html/index.html /eternal

RETVAL_STAT=""
function recompute_stat()
{
  RETVAL_STAT="stat"
  for IN in $(ls /html/*.html.template | sort) ; do
    FN=$(basename ${IN/.html.template/})
    RETVAL_STAT="$RETVAL_STAT-$FN-$(stat -c "%Y" $IN)"  # NOTE(dkorolev): Can also add `%i` for inode.
  done
}

recompute_stat
CURRENT_VERSION=$RETVAL_STAT
echo "current version: $CURRENT_VERSION"

RETVAL_FILES=""
function update_files()
{
  RETVAL_FILES="stat"
  for IN in $(ls /html/*.html.template | sort) ; do
    FN=$(basename ${IN/.html.template/})
    OUT0=${IN/.html.template/.html}
    OUT=${OUT0/\/html\//\/eternal\/}
    SHA256=$(cat $IN | sha256sum)
    SHA256_CROPPED=${SHA256:0:12}
    RETVAL_FILES="$RETVAL_FILES-$FN-$SHA256_CROPPED"
    echo "template ${IN} -> ${OUT} : $SHA256_CROPPED"
    cat $IN | sed "s/___SHA256___/$SHA256_CROPPED/g" >$OUT
  done
}

update_files
CURRENT_FILES=$RETVAL_FILES

cd /app
node server.js $RETVAL_FILES &

while true ; do
  recompute_stat
  if [ "$RETVAL_STAT" != "$CURRENT_VERSION" ] ; then
    echo 'stats changes, reviewing files data'
    update_files
    if [ "$RETVAL_FILES" != "$CURRENT_FILES" ] ; then
      echo 'files changed'
      CURRENT_FILES=$RETVAL_FILES
      curl -s "http://eternal_alpine:9876/update?shas=$RETVAL_FILES" || echo 'curl failed, but not the end of the world'
    else
      echo 'files unchanged'
    fi
    CURRENT_VERSION=$RETVAL_STAT
  else
    sleep 0.5
  fi
done

wait
