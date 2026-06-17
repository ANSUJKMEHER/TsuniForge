# TsuniForge Java Sandbox
# Minimal image with OpenJDK 17 for compiling and running Java solutions
FROM eclipse-temurin:17-jdk-alpine AS base

# Create non-root user for execution
RUN adduser -D -s /bin/sh sandbox && \
    mkdir -p /tmp/submission && \
    chown sandbox:sandbox /tmp/submission

USER sandbox
WORKDIR /tmp/submission

CMD ["sh"]
