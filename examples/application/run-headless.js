const util = require('util')
const path = require('path')
const fs = require('fs')
const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch()
  const page = await browser.newPage()
  // Redirect page's console output and errors to terminal
  page.on('console', consoleObj => {
    if (consoleObj.type() in console) {
      console[consoleObj.type()](consoleObj.text())
    } else {
      console.log(consoleObj.text())
    }
  })
  page.on('pageerror', error => {
    throw util.inspect(error)
  })

  console.log('Preparing...')
  await page.goto('http://localhost:8080/examples/application/run-headless.html')
  await page.waitFor(() => document.querySelectorAll('input').length === 2)
  await page.evaluate(() => {
    window.done = false
  })

  const ws = fs.createWriteStream(path.join(__dirname, 'run-headless.webm'), { encoding: 'binary' })

  // Listen for 'export' event.
  await page.exposeFunction('onExport', async ({ detail }) => {
    const array = detail.data
    ws.write(Buffer.from(array))
    ws.close()
    console.log(`Wrote ${array.length} bytes to ${path.join(__dirname, 'run-headless.webm')}`)
    await page.evaluate(() => {
      window.done = true
    })
  })
  await page.evaluate(() => window.addEventListener('export', ({ detail }) => {
    window.onExport({ detail })
  }))

  console.log('Importing assets...')
  // Upload through file inputs, triggering export.
  const imageInput = await page.$('#img')
  await imageInput.uploadFile(path.join(__dirname, '..', 'assets/sample.jpg'))
  const videoInput = await page.$('#video')
  await videoInput.uploadFile(path.join(__dirname, '..', 'assets/sample.ogv'))
  await page.evaluate(() => window.loadInputs())
  await page.waitFor(() => window.done, { timeout: 0 })
  await browser.close()
})()
  .catch(e => {
    throw e
  })
