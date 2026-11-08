# Multi-stage Docker build for FunTouch Spring Boot Server
# Stage 1: Build the application JAR
FROM maven:3.9.9-eclipse-temurin-21-alpine AS builder
WORKDIR /app

# Cache dependencies
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Copy source code and build
COPY src ./src
RUN mvn clean package -DskipTests

# Stage 2: Minimal lightweight runtime
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Non-root user for security
RUN addgroup -S funtouch && adduser -S funtouch -G funtouch
USER funtouch

COPY --from=builder /app/target/funtouch-server-*.jar app.jar

# Dynamic port binding for Cloud platforms (Render, Railway, Fly.io, Heroku)
ENV PORT=8080
EXPOSE 8080

ENTRYPOINT ["sh", "-c", "java -Djava.security.egd=file:/dev/./urandom -jar app.jar --server.port=${PORT:-8080}"]

