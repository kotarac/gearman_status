argv = require('minimist')(process.argv[2..])

host = argv.h or 'localhost'
jobs = argv._
port = argv.p or 4730
sort = argv.s or 'name'
watch = argv.w or false

concat = [].concat.bind []
logUpdate = require 'log-update'
NetcatClient = require('node-netcat').client
table = require 'text-table'

header = [
	'name'
	'jobs'
	'running'
	'workers'
]


client = new NetcatClient port, host


processResponse = (res) ->
	lines = res.split '\n'
	lines = lines[.. lines.length - 3]

	items = []

	for line in lines
		item = line.split '\t'
		items.push item unless item[0] not in jobs and jobs.length

	items.sort (a, b) ->
		return a[0].localeCompare b[0] if sort is 'name'
		return b[1] - a[1] if sort is 'jobs'
		return b[2] - a[2] if sort is 'running'
		return b[3] - a[3] if sort is 'workers'

	return table concat([header], items)


send = -> client.send 'status\n'
close = -> client.send '', true
log = (args...) -> logUpdate args...


client.on 'open', -> send()
client.on 'error', (err) -> console.error "ERROR: #{err.message}" if err?.message
client.on 'data', (data) ->
	res = data.toString 'ascii'
	log processResponse(res)

	if watch
		setTimeout send, watch
	else
		close()


client.start()
