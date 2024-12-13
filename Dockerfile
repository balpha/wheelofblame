FROM node:20-alpine

WORKDIR /app
COPY LICENSE.txt .
COPY package.json .
COPY yarn.lock .
RUN yarn install --frozen-lockfile

COPY prettier.config.js .
COPY tsconfig.json .
COPY src/index.ts ./src/index.ts
CMD [ "yarn", "start" ]
