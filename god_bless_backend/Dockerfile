FROM python:3.8-alpine

ENV PYTHONUNBUFFERED=1

RUN apk update && \
    apk add libffi-dev zlib-dev jpeg-dev postgresql-dev gcc python3-dev musl-dev \
    postgresql-client redis bash

WORKDIR /god_bless_django

COPY requirements.txt requirements.txt

RUN pip3 install -r requirements.txt

# Copy the entrypoint script
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Copy the application code
COPY . .

# Set the entrypoint
ENTRYPOINT ["/docker-entrypoint.sh"]
