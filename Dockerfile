FROM node
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app
RUN git clone https://github.com/loren0223/myshop /usr/src/app
RUN npm install
EXPOSE 3000
CMD [ "node", "app.js" ]