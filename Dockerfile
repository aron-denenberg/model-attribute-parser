FROM node:20.14-alpine AS development

WORKDIR /usr/src/app

# login into npm registry
ARG NPM_TOKEN
# RUN npm set //registry.npmjs.org/:_authToken $NPM_TOKEN
ENV NPM_TOKEN=${NPM_TOKEN}

RUN corepack enable && corepack prepare yarn@4.2.2 --activate

# copy package files and only install devDependencies
COPY package*.json ./
COPY yarn*.lock ./
COPY .yarnrc.yml ./

# RUN corepack enable
RUN yarn install

# copy all files and build /dist
COPY . .
RUN yarn build

ENTRYPOINT [ "yarn", "scripts:parse-model-field-attributes" ]
# production stage
FROM node:20.14-alpine as production

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

WORKDIR /usr/src/app

# login into npm registry
ARG NPM_TOKEN
# RUN npm set //registry.npmjs.org/:_authToken $NPM_TOKEN
ENV NPM_TOKEN=${NPM_TOKEN}

RUN corepack enable && corepack prepare yarn@4.2.2 --activate


COPY package*.json ./
COPY yarn*.lock ./
COPY .yarnrc.yml ./

RUN yarn install

# RUN corepack enable
COPY . .
RUN yarn build

RUN addgroup -S appgroup && adduser -S appuser -G appgroup
RUN chown -R appuser:appgroup /usr/src/app
USER appuser

ENTRYPOINT [ "yarn", "scripts:parse-model-field-attributes" ]