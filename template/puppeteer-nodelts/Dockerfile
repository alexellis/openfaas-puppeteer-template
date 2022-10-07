FROM --platform=${TARGETPLATFORM:-linux/amd64} ghcr.io/openfaas/of-watchdog:0.9.8 as watchdog
FROM --platform=${TARGETPLATFORM:-linux/amd64} ghcr.io/puppeteer/puppeteer:18.2.1

ARG TARGETPLATFORM
ARG BUILDPLATFORM

ENV APT_KEY_DONT_WARN_ON_DANGEROUS_USAGE=1
ARG ADDITIONAL_PACKAGE

USER root
RUN addgroup --system app \
    && adduser --system --ingroup app app

COPY --from=watchdog /fwatchdog /usr/bin/fwatchdog
RUN chmod +x /usr/bin/fwatchdog

# chmod for tmp is for a buildkit issue (@alexellis)
RUN chown app:app -R /home/app \
    && chmod 777 /tmp

RUN if test -n "${ADDITIONAL_PACKAGE}"; then apt-get update \
    && apt-get install -y curl gnupg \
    && curl -sLSf https://dl-ssl.google.com/linux/linux_signing_key.pub -o - | apt-key add - \
    && apt-get update ;fi

RUN if test -n "${ADDITIONAL_PACKAGE}"; then apt-get install -y ${ADDITIONAL_PACKAGE} --no-install-recommends \
    && rm -rf /var/lib/apt/lists/* ;fi

# Turn down the verbosity to default level.
ENV NPM_CONFIG_LOGLEVEL warn

RUN mkdir -p /home/app

# Entrypoint
WORKDIR /home/app
COPY package.json ./

# This ordering means the npm installation is cached for the outer function handler.
RUN npm i

# Copy outer function handler
COPY index.js ./

# COPY function node packages and install, adding this as a separate
# entry allows caching of npm install

WORKDIR /home/app/function

COPY function/*.json ./

RUN npm i || :

# COPY function files and folders
COPY function/ ./

# Run any tests that may be available
RUN npm test

# Set correct permissions to use non root user
WORKDIR /home/app/


USER app

ENV cgi_headers="true"
ENV fprocess="node index.js"
ENV mode="http"
ENV upstream_url="http://127.0.0.1:3000"

ENV exec_timeout="10s"
ENV write_timeout="15s"
ENV read_timeout="15s"
ENV PATH="${PATH}:/node_modules/.bin"

HEALTHCHECK --interval=3s CMD [ -e /tmp/.lock ] || exit 1

CMD ["fwatchdog"]

