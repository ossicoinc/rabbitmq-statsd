FROM node:12-slim

COPY ./package.json /var/app/package.json
RUN cd /var/app && npm install

COPY . /var/app

CMD ["node", "/var/app/app.js"]
