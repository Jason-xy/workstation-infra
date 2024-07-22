FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive
ENV SHELL=/bin/bash

RUN apt-get update && apt-get install -y \
    curl

RUN curl -fsSL https://kuzco.xyz/install.sh | sh

ENTRYPOINT [ "kuzco", "worker", "start", "--worker", "Y2kSKN4f5d", "--code", "49518511-8b25-4686-8683-c79d7dc6ae6f" ]
