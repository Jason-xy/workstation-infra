FROM ubuntu:22.04

RUN apt-get update && \
	apt-get install -y \
	curl \
	git \
	golang \
	sudo \
	vim \
	wget \
	bash-completion \
	software-properties-common \
	docker.io && \
	rm -rf /var/lib/apt/lists/*

ARG USER=coder
RUN useradd --groups sudo --no-create-home --shell /bin/bash ${USER} \
	&& echo "${USER} ALL=(ALL) NOPASSWD:ALL" >/etc/sudoers.d/${USER} \
	&& chmod 0440 /etc/sudoers.d/${USER}
USER ${USER}
WORKDIR /home/${USER}
