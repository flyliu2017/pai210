#基础镜像
FROM python:3.6

MAINTAINER changfeng@leinao.ai

RUN apt-get update \
    && apt-get install -y python3-pip vim\
	&& apt-get clean \
    && apt-get autoclean \
    && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/* 

RUN mkdir -p /app 

WORKDIR /app

EXPOSE 80

COPY requirements.txt /usr/src/app/

RUN pip install --upgrade pip \
	&& pip3 install -r /usr/src/app/requirements.txt \
	&& rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/* 

COPY tests.tar.gz /usr/src/app/

RUN tar -xvf /usr/src/app/tests.tar.gz

HEALTHCHECK CMD curl --fail http://localhost:3000/ || exit 1

CMD start && python3.6 test_user.py
