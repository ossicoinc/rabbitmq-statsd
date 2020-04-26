FROM node:12-slim

COPY ./package.json /var/app/package.json
RUN npm install

COPY . /var/app

CMD ["node", "/var/app/app.js"]
