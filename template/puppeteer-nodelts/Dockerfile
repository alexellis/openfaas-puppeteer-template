FROM --platform=${TARGETPLATFORM:-linux/amd64} ghcr.io/openfaas/of-watchdog:0.9.12 as watchdog
FROM --platform=${TARGETPLATFORM:-linux/amd64} ghcr.io/puppeteer/puppeteer:21.4.1

ARG TARGETPLATFORM
ARG BUILDPLATFORM

ENV APT_KEY_DONT_WARN_ON_DANGEROUS_USAGE=1
ARG ADDITIONAL_PACKAGE

USER root

COPY --from=watchdog /fwatchdog /usr/bin/fwatchdog
RUN chmod +x /usr/bin/fwatchdog

RUN if test -n "${ADDITIONAL_PACKAGE}"; then apt-get update \
    && apt-get install -y curl gnupg \
    && curl -sLSf https://dl-ssl.google.com/linux/linux_signing_key.pub -o - | apt-key add - \
    && apt-get update ;fi

RUN if test -n "${ADDITIONAL_PACKAGE}"; then apt-get install -y ${ADDITIONAL_PACKAGE} --no-install-recommends \
    && rm -rf /var/lib/apt/lists/* ;fi

# Turn down the verbosity to default level.
ENV NPM_CONFIG_LOGLEVEL warn

RUN mkdir -p /home/pptruser

# Entrypoint
WORKDIR /home/pptruser
COPY package.json ./

# This ordering means the npm installation is cached for the outer function handler.
RUN npm i

# Copy outer function handler
COPY index.js ./

# COPY function node packages and install, adding this as a separate
# entry allows caching of npm install

WORKDIR /home/pptruser/function

COPY function/*.json ./

RUN npm i || :

# COPY function files and folders
COPY function/ ./

# Run any tests that may be available
RUN npm test

# Set correct permissions to use non root user
WORKDIR /home/pptruser/

USER pptruser

ENV cgi_headers="true"
ENV fprocess="node index.js"
ENV mode="http"
ENV upstream_url="http://127.0.0.1:3000"

ENV PATH="${PATH}:/node_modules/.bin:/home/pptruser/.cache/puppeteer"

HEALTHCHECK --interval=3s CMD [ -e /tmp/.lock ] || exit 1

CMD ["fwatchdog"]

