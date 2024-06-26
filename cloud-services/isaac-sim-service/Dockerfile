FROM nvcr.io/nvidia/isaac-sim:4.0.0

ENV DEBIAN_FRONTEND=noninteractive

# Install ROS2
RUN apt update && \
    apt install curl -y && \
    curl -sSL https://raw.githubusercontent.com/ros/rosdistro/master/ros.key -o /usr/share/keyrings/ros-archive-keyring.gpg && \
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/ros-archive-keyring.gpg] http://packages.ros.org/ros2/ubuntu $(. /etc/os-release && echo $UBUNTU_CODENAME) main" | tee /etc/apt/sources.list.d/ros2.list > /dev/null && \
    apt update && \
    apt install -y ros-humble-desktop ros-dev-tools && \
    echo "source /opt/ros/humble/setup.bash" >> ~/.bashrc && \
    apt clean && \
    rm -rf /var/lib/apt/lists/*