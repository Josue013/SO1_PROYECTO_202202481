FROM mysql:8.0

ENV MYSQL_ROOT_PASSWORD=root \
    MYSQL_DATABASE=Proyecto1_Fase1 \
    MYSQL_USER=so1_user \
    MYSQL_PASSWORD=so1_password

# Copiar el script DDL
COPY ./ddl.sql /docker-entrypoint-initdb.d/

EXPOSE 3306