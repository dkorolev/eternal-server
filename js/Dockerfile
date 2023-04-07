FROM alpine

RUN apk update
RUN apk add nodejs
RUN apk add npm

RUN mkdir /app
COPY ./package.json /app
RUN (cd /app; npm i)

COPY ./server.js /app

WORKDIR /app
ENTRYPOINT ["node", "/app/server.js"]
