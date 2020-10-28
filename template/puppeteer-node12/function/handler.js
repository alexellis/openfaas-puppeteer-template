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


// before(async() => {

// })

// beforeEach(async() => {
//   
// })

// afterEach(async() => {
//   await page.close()
// })

// after(async() => {
//   await browser.close()
// })

// describe('App', () => {
//   it('renders', async() => {
//     const response = await page.goto('http://web/')
//     assert(response.ok())
//     await page.screenshot({ path: `/screenshots/app.png` })
//   })
// })