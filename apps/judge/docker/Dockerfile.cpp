# TsuniForge C++ Sandbox
# Minimal image with g++ for compiling and running C++ solutions
FROM gcc:12-bookworm AS base

# Create non-root user for execution
RUN useradd -m -s /bin/bash sandbox && \
    mkdir -p /tmp/submission && \
    chown sandbox:sandbox /tmp/submission

# Remove unnecessary tools
RUN apt-get purge -y --auto-remove && \
    rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

USER sandbox
WORKDIR /tmp/submission

# Default command: compile and run
CMD ["bash"]
