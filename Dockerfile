FROM ubuntu:14.04

RUN echo deb http://security.ubuntu.com/ubuntu trusty-security main restricted >> /etc/apt/sources.list \
    && echo deb-src http://security.ubuntu.com/ubuntu trusty-security main restricted >> /etc/apt/sources.list \
    && echo deb http://security.ubuntu.com/ubuntu trusty-security universe >> /etc/apt/sources.list \
    && echo deb-src http://security.ubuntu.com/ubuntu trusty-security universe >> /etc/apt/sources.list \
    && echo deb http://security.ubuntu.com/ubuntu trusty-security multiverse >> /etc/apt/sources.list \
    && echo deb-src http://security.ubuntu.com/ubuntu trusty-security multiverse >> /etc/apt/sources.list

RUN apt-get update \
    && apt-get install -y language-pack-en-base wget curl

RUN wget -q -O - "https://dl-ssl.google.com/linux/linux_signing_key.pub" | sudo apt-key add -
RUN echo "deb http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list
RUN curl -sL https://deb.nodesource.com/setup_6.x | sudo bash -

RUN apt-get update \
    && apt-get install -y openjdk-7-jre-headless google-chrome-stable xvfb unzip nodejs x11-xkb-utils xfonts-100dpi xfonts-75dpi xfonts-scalable xfonts-cyrillic

RUN cd /tmp \
    && wget "https://chromedriver.storage.googleapis.com/2.27/chromedriver_linux64.zip" \
    && unzip chromedriver_linux64.zip \
    && mv -f chromedriver /usr/local/share/chromedriver \
    && chmod +x /usr/local/share/chromedriver \
    && ln -s /usr/local/share/chromedriver /usr/local/bin/chromedriver \
    && ln -s /usr/local/share/chromedriver /usr/bin/chromedriver

RUN mkdir /app \
    && cd /app \ 
    && npm install selenium-webdriver async

ADD selenium-test.js /app/selenium-test.js
ADD upstart.sh /app/upstart.sh
ADD peer-inlined.html /app/peer.html
ADD walker-inlined.html /app/walker.html
ADD index.html /app/index.html

RUN chmod +x /app/upstart.sh
RUN ln -s /app/upstart.sh /usr/local/bin/test