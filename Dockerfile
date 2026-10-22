FROM node:current-alpine
RUN apk add yarn

WORKDIR /app
COPY LICENSE.txt .
COPY package.json .
COPY yarn.lock .
RUN yarn install --frozen-lockfile

COPY prettier.config.js .
COPY tsconfig.json .
COPY src/index.ts ./src/index.ts
CMD [ "yarn", "start" ]
