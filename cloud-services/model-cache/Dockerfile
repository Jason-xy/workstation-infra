FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive
ENV SHELL=/bin/bash

RUN apt-get update && apt-get install -y \
    curl \
    wget \
    git \
    python3-pip

RUN git clone https://github.com/codefuse-ai/ModelCache.git /ws
WORKDIR /ws

RUN pip3 install -r requirements.txt
RUN wget https://huggingface.co/shibing624/text2vec-base-chinese/resolve/main/pytorch_model.bin?download=true -O /ws/model/text2vec-base-chinese/pytorch_model.bin

ENTRYPOINT [ "python3", "flask4modelcache_demo.py" ]

