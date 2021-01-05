# openfaas-puppeteer-template

This [OpenFaaS template](https://www.openfaas.com/) uses [docker-puppeteer by buildkite](https://github.com/buildkite/docker-puppeteer/) to give you access to [Puppeteer](https://github.com/puppeteer/puppeteer). Puppeteer is a popular tool that can automate a headless Chrome browser for scraping fully-rendered web pages.

Use-cases:

* Run your end to end tests with mocha/jest against a real website
* Capture screenshots of sites and diff them
* Capture / scrape text from sites which have no API or are only rendered in the DOM
* Automate websites which have no API
* Create visual assets from HTML/CSS - like social sharing banners

Why do we need an OpenFaaS template? Templates provide an easy way to scaffold a microservice or function and to deploy that at scale on a Kubernetes cluster. The faasd project also gives a way for small teams to get on the experience curve, without learning anything about Kubernetes.

OpenFaaS benefits / features:

* Extend timeouts to whatever you want
* Run asynchronously, and in parallel
* Get a callback with the result when done
* Limit concurrency with `max_inflight` environment variable in stack.yml
* Trigger from cron, or events
* Get metrics on duration, HTTP exit codes, scale out across multiple nodes
* Start small with faasd

## See the full tutorial on the OpenFaaS blog

[Web scraping that just works with OpenFaaS with Puppeteer](https://www.openfaas.com/blog/puppeteer-scraping/)

## Quickstart

### Get OpenFaaS

[Deploy OpenFaaS](https://docs.openfaas.com/deployment/) to Kubernetes, or to faasd (single-node with just containerd)

### Create a function with the template and deploy it to OpenFaaS

```bash
faas-cli template pull https://github.com/alexellis/openfaas-puppeteer-template

faas-cli new --lang puppeteer-node12 scrape-title --prefix alexellis2

faas-cli up -f scrape-title.yml
```

### Example functions and invocations

#### Get the title of a webpage passed in via a JSON body

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
echo '{"uri": "https://inlets.dev/blog"}' | faas-cli invoke scrape-title \
  --header "Content-type=application/json"
```

Alternatively run async:

```bash
echo '{"uri": "https://inlets.dev/blog"}' | faas-cli invoke scrape-title \
  --async \
  --header "Content-type=application/json"
```

Run async, post the response to another service or receiver function:

```bash
echo '{"uri": "https://inlets.dev/blog"}' | faas-cli invoke scrape-title \
  --async \
  --header "Content-type=application/json" \
  --header "X-Callback-Url=https://en98kppbwx32.x.pipedream.net"
```

#### Take a screenshot and return it as a binary response

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
faas-cli invoke screenshot-page \
  --header "Content-type=application/json" > screenshot.png

open screenshot.png
```

#### Produce homepage banners and social sharing images

You can also produce homepage banners and social sharing images by rendering HTML locally, and then saving a screenshot.

Unlike a SaaS service, you'll have no month fees to pay, and get unlimited use, you can also customise the code and trigger it however you like.

The execution time is very quick at under 0.5s per image and could be made faster by preloading the Chromium browser and re-using it. if you cache the images to `/tmp/` or save them to a CDN, you'll have single-digit latency.

```bash
# Set to your Docker Hub account or registry address
export OPENFAAS_PREFIX=alexellis2

faas-cli new --lang puppeteer-node12 banner-gen --prefix $OPENFAAS_PREFIX
```

Edit `./banner-gen/handler.js`


```js
'use strict'
const assert = require('assert')
const puppeteer = require('puppeteer')
const fs = require('fs');
const fsPromises = fs.promises;

module.exports = async (event, context) => {
  let browser = await puppeteer.launch({
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage'
    ]
  })

  const browserVersion = await browser.version()
  console.log(`Started ${browserVersion}`)
  let page = await browser.newPage()

  let title = "Set your title"
  let avatar = "https://avatars2.githubusercontent.com/u/6358735?s=160&amp;v=4"

  console.log("query",event.query)

  if(event.query) {
    if(event.query.url) {
      url = event.query.url
    }
    if(event.query.avatar) {
      avatar = event.query.avatar
    }
    if(event.query.title) {
      title = event.query.title
    }
  }

  let html = `<html><body><h2>TITLE</h2><img src="AVATAR" alt="Avatar" width="120px" height="120px" /></body></html>`
  html = html.replace("TITLE", title)
  html = html.replace("AVATAR", avatar)

  await page.setContent(html)
  await page.setViewport({ width: 1720, height: 460 });
  await page.screenshot({ path: `/tmp/page.png` })

  let data = await fsPromises.readFile("/tmp/page.png")

  await browser.close()
  return context
    .status(200)
    .headers({"Content-type": "image/png"})
    .succeed(data)
}
```

Deploy the function:

```bash
faas-cli up -f banner-gen.yml
```

Example usage:

```bash

curl -G "http://127.0.0.1:8080/function/generate-banner" \
 --data-urlencode "avatar=https://avatars2.githubusercontent.com/u/6358735?s=160&amp;v=4" \
 --data-urlencode "title=Time for your favourite website to get social banners" \
 -o out.png
```

Note that the inputs are URLEncoded for the querystring. You can also use the `event.body` if you wish to access the function programmatically, instead of from a browser.

This is an example image generated for my [GitHub Sponsors page](https://github.com/sponsors/alexellis) which uses a different HTML template, that's loaded from disk.

![Generated image](https://github.com/alexellis/alexellis/blob/master/sponsor-today.png?raw=true)

HTML: [sponsor-cta.html](https://github.com/alexellis/alexellis/blob/master/sponsor-cta.html)

## See the full tutorial on the OpenFaaS blog

[Web scraping that just works with OpenFaaS with Puppeteer](https://www.openfaas.com/blog/puppeteer-scraping/)

