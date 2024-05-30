FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive
ENV SHELL=/bin/bash

RUN apt-get update && apt-get install -y \
    curl

RUN curl -fsSL https://kuzco.xyz/install.sh | sh

ENTRYPOINT [ "kuzco", "worker", "start" ]
