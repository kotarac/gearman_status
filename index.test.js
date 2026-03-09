const assert = require('node:assert')
const net = require('node:net')
const test = require('node:test')
const { spawn } = require('node:child_process')

const responses = ['zeta\t2\t1\t1\nalpha\t9\t3\t2\nbeta\t4\t0\t5\n.\n', 'zeta\t2\t1\t1\nalpha\t9\t3\t2\nbeta\t4\t0\t5\n.\n']

function runCli(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['index.js', ...args], { stdio: ['ignore', 'pipe', 'pipe'] })
    let stdout = ''
    let stderr = ''
    const timer = setTimeout(() => {
      child.kill('SIGTERM')
      reject(new Error(`CLI timed out\nstdout: ${stdout}\nstderr: ${stderr}`))
    }, 3000)
    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString('utf8')
    })
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString('utf8')
    })
    child.on('error', (err) => {
      clearTimeout(timer)
      reject(err)
    })
    child.on('exit', (code, signal) => {
      clearTimeout(timer)
      resolve({ code, signal, stdout, stderr })
    })
  })
}

function listen(server) {
  return new Promise((resolve, reject) => {
    server.listen(0, '127.0.0.1')
    server.once('listening', resolve)
    server.once('error', reject)
  })
}

function close(server) {
  return new Promise((resolve, reject) => {
    server.close((err) => {
      if (err) {
        reject(err)
        return
      }
      resolve()
    })
  })
}

test('cli prints and sorts gearman status output end to end', async () => {
  let requestCount = 0
  const server = net.createServer((socket) => {
    socket.on('data', (chunk) => {
      const command = chunk.toString('ascii')
      if (command !== 'status\n') {
        socket.end()
        return
      }
      const response = responses[requestCount] || responses[responses.length - 1]
      requestCount += 1
      socket.end(response)
    })
  })

  await listen(server)
  try {
    const address = server.address()
    if (!address || typeof address === 'string') {
      throw new Error('Failed to get mock server address')
    }
    const baseArgs = ['-h', '127.0.0.1', '-p', String(address.port)]
    const defaultRun = await runCli(baseArgs)
    assert.strictEqual(defaultRun.code, 0, defaultRun.stderr || 'default run failed')
    assert.strictEqual(defaultRun.signal, null)
    assert.match(defaultRun.stdout, /name\s+jobs\s+running\s+workers/)
    assert.match(defaultRun.stdout, /alpha\s+9\s+3\s+2/)
    assert.match(defaultRun.stdout, /beta\s+4\s+0\s+5/)
    assert.match(defaultRun.stdout, /zeta\s+2\s+1\s+1/)
    assert.ok(defaultRun.stdout.indexOf('alpha') < defaultRun.stdout.indexOf('beta'))
    assert.ok(defaultRun.stdout.indexOf('beta') < defaultRun.stdout.indexOf('zeta'))
    const sortedFilteredRun = await runCli([...baseArgs, '-s', 'jobs', 'beta', 'alpha'])
    assert.strictEqual(sortedFilteredRun.code, 0, sortedFilteredRun.stderr || 'sorted/filtered run failed')
    assert.strictEqual(sortedFilteredRun.signal, null)
    assert.match(sortedFilteredRun.stdout, /alpha\s+9\s+3\s+2/)
    assert.match(sortedFilteredRun.stdout, /beta\s+4\s+0\s+5/)
    assert.doesNotMatch(sortedFilteredRun.stdout, /zeta\s+2\s+1\s+1/)
    assert.ok(sortedFilteredRun.stdout.indexOf('alpha') < sortedFilteredRun.stdout.indexOf('beta'))
    assert.strictEqual(requestCount, 2)
  } finally {
    await close(server)
  }
})
