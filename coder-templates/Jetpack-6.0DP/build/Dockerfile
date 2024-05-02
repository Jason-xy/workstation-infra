FROM nvcr.io/nvidia/l4t-tensorrt:r8.6.2-devel

RUN apt-get update && \
	apt-get install -y \
	curl \
	git \
	golang \
	sudo \
	vim \
	wget \
	bash-completion \
	software-properties-common && \
	rm -rf /var/lib/apt/lists/*

ARG USER=coder
RUN useradd --groups sudo --no-create-home --shell /bin/bash ${USER} \
	&& echo "${USER} ALL=(ALL) NOPASSWD:ALL" >/etc/sudoers.d/${USER} \
	&& chmod 0440 /etc/sudoers.d/${USER}
USER ${USER}
WORKDIR /home/${USER}
