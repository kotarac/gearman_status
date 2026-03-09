#!/usr/bin/env node

const argv = require('minimist')(process.argv.slice(2))
const logUpdate = require('log-update')
const net = require('node:net')
const table = require('text-table')

const host = argv.h || 'localhost'
const jobs = argv._
const port = argv.p || 4730
const sort = argv.s || 'name'
const watch = argv.w || false
const concat = [].concat.bind([])
const header = ['name', 'jobs', 'running', 'workers']
let buffer = ''
let awaitingResponse = false
const client = net.createConnection({ port, host })

function processResponse(res) {
  const lines = res.split('\n').slice(0, -2)
  const items = []
  for (const line of lines) {
    const item = line.split('\t')
    if (!jobs.length || jobs.includes(item[0])) {
      items.push(item)
    }
  }
  items.sort((a, b) => {
    if (sort === 'name') {
      return a[0].localeCompare(b[0])
    }
    if (sort === 'jobs') {
      return b[1] - a[1]
    }
    if (sort === 'running') {
      return b[2] - a[2]
    }
    if (sort === 'workers') {
      return b[3] - a[3]
    }
    return 0
  })
  return table(concat([header], items))
}

function log(...args) {
  return logUpdate(...args)
}

function close() {
  client.end()
}

function handleResponse(res) {
  awaitingResponse = false
  log(processResponse(res))
  if (watch) {
    setTimeout(send, watch)
    return
  }
  close()
}

function processBuffer() {
  if (buffer === '.\n') {
    handleResponse('.\n')
    return
  }
  const markerIndex = buffer.indexOf('\n.\n')
  if (markerIndex === -1) {
    return
  }
  const res = buffer.slice(0, markerIndex + 3)
  buffer = buffer.slice(markerIndex + 3)
  handleResponse(res)
}

function send() {
  if (awaitingResponse) {
    return
  }
  awaitingResponse = true
  client.write('status\n')
}

client.on('connect', () => {
  send()
})
client.on('error', (err) => {
  if (err?.message) {
    console.error(`ERROR: ${err.message}`)
  }
})
client.on('data', (data) => {
  buffer += data.toString('ascii')
  processBuffer()
})
