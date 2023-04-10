FROM alpine

RUN apk update
RUN apk add nodejs npm

RUN mkdir /app
COPY ./package.json /app
RUN (cd /app; npm i)

COPY ./server.js /app

COPY ./entrypoint.sh /
ENTRYPOINT ["/entrypoint.sh"]
