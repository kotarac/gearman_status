# gearman_status

Simple CLI tool for checking Gearman job server status.


## Install

```sh
npm -g i gearman_status
```


## Usage

Options and their defaults:
```
gearman_status -h localhost -p 4730 -w 0 -s name job_1_name job_2_name
```

-w takes milliseconds as an argument and keeps polling the server and updating the output.
Default 0 means gearman_status will just get the status, print and exit.

-s sorts by either "name", "jobs", "running" or "workers".

If you specify any job names, gearman_status will only print the status of those jobs.


Example output:
```
name                              jobs   running  workers
job_1_name  	                  13389  90       90
job_2_name                        395    29       29
```


## License

MIT © Stipe Kotarac (https://github.com/kotarac)
