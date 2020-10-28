# openfaas-puppeteer-template

openfaas-puppeteer-template

## Intro

This template uses [docker-puppeteer by buildkite](https://github.com/buildkite/docker-puppeteer/) to give you access to [Puppeteer](https://github.com/puppeteer/puppeteer). Puppeteer is a popular tool that can automate a headless Chrome browser for scraping fully-rendered web pages.

## Get OpenFaaS

[Deploy OpenFaaS](https://docs.openfaas.com/deployment/) to Kubernetes, or to faasd (single-node with just containerd)

## Create a function and deploy it to OpenFaaS

```bash
faas-cli template pull https://github.com/alexellis/openfaas-puppeteer-template

faas-cli new --lang puppeteer-node12 scrape-title --prefix alexellis2

faas-cli up -f scrape-title.yml
```

## Example invocation

### Get the title of a webpage passed in via a JSON body

```javascript
'use strict'
const assert = require('assert')
const puppeteer = require('puppeteer')

module.exports = async (event, context) => {
  let browser
  let page
  
  browser = await puppeteer.launch({
    args: [
      // Required for Docker version of Puppeteer
      '--no-sandbox',
      '--disable-setuid-sandbox',
      // This will write shared memory files into /tmp instead of /dev/shm,
      // because Docker’s default for /dev/shm is 64MB
      '--disable-dev-shm-usage'
    ]
  })

  const browserVersion = await browser.version()
  console.log(`Started ${browserVersion}`)
  page = await browser.newPage()
  let uri = "https://inlets.dev/blog/"
  if(event.body && event.body.uri) {
    uri = event.body.uri
  }

  const response = await page.goto(uri)
  console.log("OK","for",uri,response.ok())

  let title = await page.title()
  const result = {
    "title": title
  }

  browser.close()
  return context
    .status(200)
    .succeed(result)
}
```

```bash
echo '{"uri": "https://inlets.dev/blog"}' | faas-cli invoke scrape-title --header "Content-type=application/json"
```

Alternatively run async:

```bash
echo '{"uri": "https://inlets.dev/blog"}' | faas-cli invoke scrape-title --async --header "Content-type=application/json"
```

### Take a screenshot and return it as a binary response

```javascript
'use strict'
const assert = require('assert')
const puppeteer = require('puppeteer')
const fs = require('fs').promises

module.exports = async (event, context) => {
  let browser
  let page
  
  browser = await puppeteer.launch({
    args: [
      // Required for Docker version of Puppeteer
      '--no-sandbox',
      '--disable-setuid-sandbox',
      // This will write shared memory files into /tmp instead of /dev/shm,
      // because Docker’s default for /dev/shm is 64MB
      '--disable-dev-shm-usage'
    ]
  })

  const browserVersion = await browser.version()
  console.log(`Started ${browserVersion}`)
  page = await browser.newPage()
  let uri = "https://inlets.dev/blog/"
  if(event.body && event.body.uri) {
    uri = event.body.uri
  }

  const response = await page.goto(uri)
  console.log("OK","for",uri,response.ok())

  let title = await page.title()
  const result = {
    "title": title
  }
  await page.screenshot({ path: `/tmp/page.png` })

  let data = await fs.readFile("/tmp/page.png")

  browser.close()
  return context
    .status(200)
    .headers({"Content-type": "application/octet-stream"})
    .succeed(data)
}
```

```bash
echo '{"uri": "https://inlets.dev/blog"}' | \
faas-cli invoke screenshot-page --header "Content-type=application/json" > screenshot.png
```
