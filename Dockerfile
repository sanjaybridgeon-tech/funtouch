# Multi-stage Docker build for FunTouch Spring Boot Server (Repository Root)
FROM maven:3.9.9-eclipse-temurin-21-alpine AS builder
WORKDIR /app

# Copy pom.xml from server directory
COPY server/pom.xml .
RUN mvn dependency:go-offline -B

# Copy server source code and build
COPY server/src ./src
RUN mvn clean package -DskipTests

# Stage 2: Lightweight runtime
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

RUN addgroup -S funtouch && adduser -S funtouch -G funtouch
USER funtouch

COPY --from=builder /app/target/funtouch-server-*.jar app.jar

ENV PORT=8080
EXPOSE 8080

ENTRYPOINT ["sh", "-c", "java -Djava.security.egd=file:/dev/./urandom -jar app.jar --server.port=${PORT:-8080}"]

