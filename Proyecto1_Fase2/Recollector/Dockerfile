FROM golang:alpine AS build

RUN apk add --no-cache git

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN go build -o recolector

FROM alpine:latest

WORKDIR /app

COPY --from=build /app/recolector ./

# Variable de entorno para Locust
ENV LOCUST_URL="http://170.150.28.90:8089/receive-data"

ENTRYPOINT ["./recolector"]

EXPOSE 5200