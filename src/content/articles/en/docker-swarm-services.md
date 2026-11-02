---
title: "Deep Dive into the Services in Docker Swarm"
description: "An introduction to Services and Tasks in Docker Swarm, followed by creating and managing Services in a cluster."
pubDate: "2022-08-26T14:54:44.000Z"
tags: ["docker"]
lang: en
---

## Services and Tasks

### What is a Service?

If you have used Docker, you will remember `docker run`, which creates and starts a container. Specify a container name and image, and Docker Engine downloads and runs what it needs.

Where Docker's basic deployment unit is a container, Swarm's is a **Service**. Often described as a collection of containers from the same image, it is more precisely **an object defining a group of containers to run in a cluster from one image**.

**A Service is declaratively configured.** Define the desired state, and Docker continually performs the work needed to maintain it. The definition can include:

- The image to deploy
- The number of containers
- Their deployment mode
- Their volumes
- Conditions governing eligible nodes
- Update strategies and policies

### How Services relate to Tasks

A **Task is the deployment unit for an individual container created and placed on a cluster node according to the Service specification**. Tasks receive names in the form `service-name.sequence-number`. Swarm creates the specified number of `replicas` and distributes them among available nodes.

![The relationship between Services and Tasks. Source: official documentation.](/content/images/2022/08/service-task.png)

This diagram shows an Nginx Service configured with three replicas of `nginx:latest`. The Swarm manager reads the specification and assigns three Tasks to available nodes. Each Task runs one container based on that image.

## Service creation basics

All commands here run only on a **manager node in Swarm mode**.

### Create a Service

Use `docker service create`. This creates an `nginx` Service with five replicas. All flags are optional except for the image argument at the end:

```bash
docker service create --name nginx \
  --replicas=5 \
  --publish=8080:80 \
  nginx:latest
```

- `--name`: Service name; otherwise a random combination of words is generated.
- `--replicas`: Number of Tasks or containers to distribute across available nodes.
- `--publish`: Port forwarding for external access. It specifies the node port, `published`, and the Service port, `target`. Here it can also be written `--publish published=8080,target=80`. Without an explicit published port, Swarm assigns one in `30000`-`32767`.
- `nginx:latest`: The image used by each Task.

### Inspect Services

`docker service ls` lists Services running in the cluster. For our `nginx` Service on a three-node cluster:

```bash
ID             NAME      MODE         REPLICAS   IMAGE          PORTS
w1v8rn73q95w   nginx     replicated   5/5        nginx:latest   *:8080->80/tcp
```

- `ID`: Unique Service ID.
- `NAME`: Service name, also unique within the cluster.
- `MODE`: `replicated` or `global`. The default is `replicated`; we will explore the difference shortly.
- `REPLICAS`: The configured replica count and its current state.
- `IMAGE`: The underlying image.
- `PORTS`: Port forwarding configuration.

Use `docker service inspect` for details. It returns JSON by default; add `--pretty` for readability:

```bash
# docker service inspect <SERVICE-ID>
docker service inspect nginx --pretty

# The following is an excerpt of the output.
ID:		3104e3cffp1ahfh401q2xhtqe
Name:		nginx
Service Mode:	Replicated
 Replicas:	5
Placement:
...
```

### List Tasks and their states

Use `docker service ps <service-name>`, distinct from `ls`, which lists Services:

```bash
# docker service scale <SERVICE-ID>
docker service ps nginx

ID             NAME          IMAGE          NODE             DESIRED STATE   CURRENT STATE                ERROR     PORTS
nhxtav0xuwit   nginx.1       nginx:latest   sjhong-node-01   Running         Running 24 minutes ago
vzv1rdk9j7vg   nginx.2       nginx:latest   sjhong-node-02   Running         Running 24 minutes ago
idxn4eijmbah   nginx.3       nginx:latest   sjhong-node-01   Running         Running about a minute ago
d5eihdbj6k1j    \_ nginx.3   nginx:latest   sjhong-node-03   Shutdown        Shutdown 53 seconds ago
tmrm8spqybaj   nginx.4       nginx:latest   sjhong-node-02   Running         Running 24 minutes ago
uj1jftdr2asu   nginx.5       nginx:latest   sjhong-node-01   Running         Running about a minute ago
q2ifir5siodm    \_ nginx.5   nginx:latest   sjhong-node-03   Shutdown        Shutdown 53 seconds ago
```

- `ID`: Unique Task ID.
- `NAME`: Unique Task name, generated as `service-name.sequence-number`. When a Task stops and is recreated elsewhere, the old entry receives a `\_` prefix.
- `IMAGE`: The container image.
- `NODE`: Assigned node.
- `DESIRED STATE`: The state Swarm intends to maintain. [Possible states are listed here.](https://docs.docker.com/engine/swarm/how-swarm-mode-works/swarm-task-states/)
- `CURRENT STATE`: Actual state and when it began.
- `ERROR`: Error information for a Task that exited as `Failed`.
- `PORTS`: Port information when the Service is exposed directly through the host IP rather than port forwarding, using `mode=host` with `--publish`.

### View Service logs

`docker service logs` shows container logs, meaning everything written to `STDOUT` and `STDERR`:

```bash
docker services logs <options> <service-name-or-ID|task-ID>
```

Choose a Service name or ID, or a Task ID:

- A Service name or ID returns logs from all its Tasks.
- A Task ID returns only that Task's container logs.

Useful flags include:

- `--follow`, `-f`: Stream logs continuously to the console.
- `--tail`, `-n`: Show the specified number of most recent lines. Negative values or `all` show everything.
- `--since`: Show logs since a timestamp such as `2022-08-26T13:23:37Z`, a date such as `2022-08-26`, or a recent duration such as `1h30m`.
- `--timestamps`, `-t`: Add a timestamp to each line.

### External access and load balancing

Swarm provides an **Ingress** network that exposes nodes externally and balances traffic. For our Service, **port 8080 on any cluster node reaches one of nginx's five Tasks**. Even if only node 1 hosts Tasks, connecting to `node2:8080` can reach one on node 1.

This also allows an external load balancer in front of the cluster. The following [official documentation](https://docs.docker.com/engine/swarm/ingress/) diagram shows how traffic arriving at one IP can be distributed to port `8080` on each node:

![Ingress networking with HAProxy as an external load balancer. Source: official documentation.](/content/images/2022/08/ingress-network.png)

### Delete a Service

`docker service rm` removes a Service and all its Task containers from their nodes. Mounted Docker volumes remain unless separately deleted:

```bash
docker service rm <service-name>
```

## Working with Services

### Scale a Service

Adjust an existing Service's replica count with `docker service scale`:

```bash
# docker service scale <SERVICE-ID>=<NUMBER-OF-TASKS>
docker service scale nginx=3

# Listing Services again shows the replica count reduced to three.
docker service ls

ID             NAME      MODE         REPLICAS               IMAGE          PORTS
w1v8rn73q95w   nginx     replicated   3/3                    nginx:latest   *:8080->80/tcp
```

**Swarm does not provide autoscaling like Kubernetes.** Scaling requires an explicit command. This is disappointing.

### Select the Service mode

Our `nginx` Service showed `replicated` in `MODE`. Swarm has two main modes:

- `replicated`: Distribute the required number of Tasks among cluster nodes. This is the usual mode.
- `global`: Require one Task on every node, resembling a Kubernetes DaemonSet.

![Replicated and global modes compared. Source: official documentation.](/content/images/2022/08/service-modes.png)

`global` is useful for log collectors monitoring each node. Add `--mode` when creating the Service. An existing Service's mode cannot be changed:

```bash
docker service create --name logstash \
 --mode global \
 logstash:8.4.0
```

### Restrict Tasks to particular nodes

Production nodes often have distinct purposes. Assign labels and use `--constraint` to require or exclude particular nodes. Combine it with `--replicas-max-per-node` to limit the Tasks assigned to each node.

Suppose only `sjhong-node-03` has `type=redis`. Deploy:

```bash
docker service create --name redis \
  --replicas 2 \
  --replicas-max-per-node 1 \
  --constraint node.labels.type==redis \
  redis
```

- Use `target==value` or `target!=value` in `--constraint`.
- Only equality and inequality are supported, so label-based constraints require `key=value` labels.
- For a node label, write the target as `node.label.<key>==<value>`.
- Repeat `--constraint` for multiple conditions.

This produces an issue: no eligible node is available for the second Task:

```bash
# Error printed during Service creation
overall progress: 1 out of 2 tasks
1/2: running
2/2: no suitable node (scheduling constraints not satisfied on 2 nodes; max rep…
```

Exit with `Ctrl+C` and inspect Services and Tasks. Only `sjhong-node-03` receives a Task; the limit of `1` from `--replicas-max-per-node` leaves `redis.1` in `Pending`:

```bash
# Output of docker service ls
ID             NAME      MODE         REPLICAS               IMAGE          PORTS
w1v8rn73q95w   nginx     replicated   3/3                    nginx:latest   *:8080->80/tcp
ig98nchhrqd1   redis     replicated   1/2 (max 1 per node)   redis:latest
```

```bash
# Output of docker service ps redis
ID             NAME      IMAGE          NODE             DESIRED STATE   CURRENT STATE           ERROR                              PORTS
uuny23s57c6i   redis.1   redis:latest                    Running         Pending 5 minutes ago   "no suitable node (scheduling …"
hl6gr16s1x0l   redis.2   redis:latest   sjhong-node-03   Running         Running 5 minutes ago
```

### Prefer particular nodes where possible

A similar but different option is **placement preference**, `--placement-pref`, which spreads Tasks among nodes matching a condition. Unlike a constraint, it schedules on other nodes if no matching node is available.

Again, only `sjhong-node-03` has `type=redis`:

```bash
docker service create --name redis \
  --replicas 2 \
  --replicas-max-per-node 1 \
  --placement-pref 'spread=node.labels.type' \
  redis
```

- `--placement-pref` takes `<strategy>=<arg>`, specifying a scheduling strategy and target.
- Swarm currently supports only **spread**, so the strategy is effectively fixed.
- Unlike `--constraint`, the target specifies only a label key, not `key==value`.
- This example spreads Tasks across nodes carrying the key `type`, falling back to other nodes when needed.

The Service and Tasks deploy normally. One Task goes first to `sjhong-node-03`; lacking another matching node, the remaining Task goes to `sjhong-node-02`:

```bash
# Output of docker service ls
ID             NAME      MODE         REPLICAS               IMAGE          PORTS
w1v8rn73q95w   nginx     replicated   3/3                    nginx:latest   *:8080->80/tcp
pa5prvap05q8   redis     replicated   2/2 (max 1 per node)   redis:latest

# Output of docker service ps redis
ID             NAME      IMAGE          NODE             DESIRED STATE   CURRENT STATE            ERROR     PORTS
ihx8uvlcejar   redis.1   redis:latest   sjhong-node-02   Running         Running 38 seconds ago
9gf09vi1zju0   redis.2   redis:latest   sjhong-node-03   Running         Running 43 seconds ago
```

### Configure volumes

`docker run` uses `--volume`. Swarm Services use `--mount` instead.

Swarm supports four mount types, selected by `type`, defaulting to `volume`:

- `volume`: Mount a Docker-managed volume.
- `bind`: Mount a host path or file directly.
- `tmpfs`: Mount [temporary file storage in memory](https://www.kernel.org/doc/html/latest/filesystems/tmpfs.html).
- `npipe`: Mount a host [named pipe](https://docs.microsoft.com/en-us/windows/win32/ipc/named-pipes), available only to Windows containers.

We will focus on the common `volume` and `bind` types.

#### Data Volume

A data volume is managed by Docker. Mount one when creating a Service:

```bash
docker service create --name <service-name> \
  --mount type=volume,source=<docker-volume-name>,destination=<container-path> \
  <image>
```

- Set `type=volume`, or omit `type`.
- `source` is the volume name. A volume not already present is created automatically.
- `destination` is its path inside the container, also created automatically if absent.

This example connects `html` to `/usr/share/nginx/html` for a three-replica Nginx Service and labels the volume `type=html`. All Tasks in the Service share the resulting volume:

```bash
docker service create --name nginx \
  --replicas 3 \
  --mount type=volume,source=html,destination=/usr/share/nginx/html,volume-label="type=html" \
  nginx
```

Without `source`, each replica receives its own unnamed **anonymous volume**. This is useful for temporary storage not shared with other Tasks. Anonymous volumes are removed when Tasks no longer use them.

For an existing Service, add or remove mounts with `docker service update --mount-add` or `--mount-rm`. For removal, specify the container path rather than the volume name:

```bash
# Mount html2 at /usr/share/nginx/html2 in the container
docker service update \
  --mount-add type=volume,source=html2,destination=/usr/share/nginx/html2 \
  nginx

# Remove the html2 mount from the container
docker service update \
  --mount-rm /usr/share/nginx/html2 \
  nginx
```

#### Bind Mount

Bind mounts connect a host path or file directly to a container:

```bash
docker service create --name <service-name> \
  --mount type=bind,source=<host-path>,destination=<container-path> \
  <image>
```

- `source` is the host path; `destination` is the container path. Docker mounts the former at the latter.
- The source must already exist. Otherwise Service creation fails.
- The default is read-write. Add `readonly` for a read-only mount.

Bind mounts are **generally not recommended in real clusters**:

- A Swarm cluster generally spans multiple nodes, and a Service container can be placed on any available node.
- If it needs a configuration file bound from a host path, **every eligible node must have that same file at that same path**. Swarm cannot mount a nonexistent host path.
- This **undermines consistent application operation across hosts**. Depending on a particular path means containers working in development are no longer guaranteed to work identically in production.

### Configure rolling updates

#### Update policy

A **rolling update** upgrades a multi-instance Service gradually, updating a specified number of instances at a time. The alternative, **recreate**, replaces all instances together. Distributed systems generally favor rolling updates for deployment without downtime.

Using Redis, let us configure future updates at Service creation:

```bash
docker service create --name redis \
  --replicas 5 \
  --update-delay 20s \
  --update-parallelism 2 \
  --update-failure-action rollback \
  redis:7.0.3
```

- `--update-delay`: Interval between update batches. Supports seconds (`s`), minutes (`m`), hours (`h`), and combinations such as `5m30s`. Default: `0s`.
- `--update-parallelism`: Tasks updated at once. Default: `1`; `0` updates all Tasks simultaneously.
- `--update-failure-action`: `pause`, `continue` past failed Tasks, or `rollback` to the previous version. Default: `pause`.

This creates five `redis:7.0.3` Tasks, updating two at a time with twenty seconds between batches and rolling back on failure. Inspect the policy under `UpdateConfig`:

```bash
# Output of docker service inspect redis --pretty
ID:		quqyc3sordlv4fuqenk4snrcn
Name:		redis
Service Mode:	Replicated
 Replicas:	5
Placement:
UpdateConfig:
 Parallelism:	2
 Delay:		20s
 On failure:	rollback
 Monitoring Period: 5s
 Max failure ratio: 0
 Update order:      stop-first
...
```

#### Rollback policy

Rollback policy is configured similarly and can accompany update flags:

```bash
docker service create --name redis \
  --replicas 5 \
  --rollback-delay 10s \
  --rollback-parallelism 1 \
  --rollback-failure-action pause \
  redis:7.0.3
```

- `--rollback-delay`: Interval between rollback batches. Default: `0s`.
- `--rollback-parallelism`: Tasks rolled back at once. Default: `1`; `0` rolls all back together.
- `--rollback-failure-action`: Either `pause` or `continue`. Default: `pause`.

Inspect `RollbackConfig`:

```bash
# Output of docker service inspect redis --pretty
ID:		ysags4buoofr0lxn8bu7o9g2f
Name:		redis
Service Mode:	Replicated
 Replicas:	5

...

RollbackConfig:
 Parallelism:	1
 Delay:		10s
 On failure:	pause
 Monitoring Period: 5s
 Max failure ratio: 0
 Rollback order:    stop-first
```

Update and rollback policies need not match. For example, update two Tasks at a time but roll back one at a time.

### Perform a rolling update

Update the Service above from `redis:7.0.3` to `redis:7.0.4`:

```bash
docker service update --image redis:7.0.4 redis
```

In `overall progress`, two Tasks at a time are recreated and enter `running`, followed by the delay specified in `--update-delay`.

After `verify: Service converged`, list Services and Tasks. New-version Tasks have replaced the old ones:

```bash
# Output of docker service ls after the update
ID             NAME      MODE         REPLICAS   IMAGE         PORTS
ysags4buoofr   redis     replicated   5/5        redis:7.0.4

# Output of docker service ps redis after the update
ID             NAME          IMAGE         NODE             DESIRED STATE   CURRENT STATE                 ERROR     PORTS
80stq3sx3q2p   redis.1       redis:7.0.4   sjhong-node-01   Running         Running 57 seconds ago
lvfjk8n5j42w    \_ redis.1   redis:7.0.3   sjhong-node-03   Shutdown        Shutdown about a minute ago
oz6ugjp3qlyw   redis.2       redis:7.0.4   sjhong-node-01   Running         Running 39 seconds ago
mn230m0gpfs6    \_ redis.2   redis:7.0.3   sjhong-node-01   Shutdown        Shutdown 40 seconds ago
m1b5pk92bayc   redis.3       redis:7.0.4   sjhong-node-02   Running         Running about a minute ago
jt86hc3ep1ru    \_ redis.3   redis:7.0.3   sjhong-node-02   Shutdown        Shutdown about a minute ago
nfo4xebv8gew   redis.4       redis:7.0.4   sjhong-node-02   Running         Running 17 seconds ago
wm1yrfs56ddp    \_ redis.4   redis:7.0.3   sjhong-node-03   Shutdown        Shutdown 18 seconds ago
3fzmk9fe6ouc   redis.5       redis:7.0.4   sjhong-node-03   Running         Running 35 seconds ago
q8qfivoh8yz2    \_ redis.5   redis:7.0.3   sjhong-node-02   Shutdown        Shutdown 36 seconds ago
```

### Perform a rollback

Return the Service to `redis:7.0.3`:

```bash
docker service update --rollback redis
```

`--rollback` restores the state before the most recent `docker service update`. Unfortunately, it cannot target a state several updates earlier.

`overall progress` shows one Task rolling back at a time, with ten-second intervals, as configured.

Once complete, inspect the Service and Tasks. The image is back to `redis:7.0.3`:

```bash
# Output of docker service ls after the update
ID             NAME      MODE         REPLICAS   IMAGE         PORTS
ysags4buoofr   redis     replicated   5/5        redis:7.0.3

# Output of docker service ps redis after the update
ID             NAME          IMAGE         NODE             DESIRED STATE   CURRENT STATE             ERROR     PORTS
b4nrae24zkyu   redis.1       redis:7.0.3   sjhong-node-03   Running         Running 2 minutes ago
80stq3sx3q2p    \_ redis.1   redis:7.0.4   sjhong-node-01   Shutdown        Shutdown 2 minutes ago
lvfjk8n5j42w    \_ redis.1   redis:7.0.3   sjhong-node-03   Shutdown        Shutdown 17 minutes ago
yb2rtwjobqjl   redis.2       redis:7.0.3   sjhong-node-01   Running         Running 2 minutes ago
oz6ugjp3qlyw    \_ redis.2   redis:7.0.4   sjhong-node-01   Shutdown        Shutdown 2 minutes ago
mn230m0gpfs6    \_ redis.2   redis:7.0.3   sjhong-node-01   Shutdown        Shutdown 17 minutes ago
tciegp38r0f7   redis.3       redis:7.0.3   sjhong-node-01   Running         Running 2 minutes ago
m1b5pk92bayc    \_ redis.3   redis:7.0.4   sjhong-node-02   Shutdown        Shutdown 2 minutes ago
jt86hc3ep1ru    \_ redis.3   redis:7.0.3   sjhong-node-02   Shutdown        Shutdown 17 minutes ago
5edbdb8g3wl8   redis.4       redis:7.0.3   sjhong-node-02   Running         Running 2 minutes ago
nfo4xebv8gew    \_ redis.4   redis:7.0.4   sjhong-node-02   Shutdown        Shutdown 2 minutes ago
wm1yrfs56ddp    \_ redis.4   redis:7.0.3   sjhong-node-03   Shutdown        Shutdown 16 minutes ago
ia4suok6yivv   redis.5       redis:7.0.3   sjhong-node-03   Running         Running 2 minutes ago
3fzmk9fe6ouc    \_ redis.5   redis:7.0.4   sjhong-node-03   Shutdown        Shutdown 2 minutes ago
q8qfivoh8yz2    \_ redis.5   redis:7.0.3   sjhong-node-02   Shutdown        Shutdown 17 minutes ago
```

The [official documentation](https://docs.docker.com/engine/reference/commandline/service_update/#roll-back-to-the-previous-version-of-a-service) says `--rollback` can be combined with other flags. In practice, however, I received only an error. Keep this in mind:

```bash
docker service update --rollback --rollback-delay 5s redis

# The command above produces only the following error.
other flags may not be combined with --rollback
```

## References

- [Docker Docs: Deploy services to a swarm](https://docs.docker.com/engine/swarm/services/)
- [Docker Docs: Use swarm mode routing mesh](https://docs.docker.com/engine/swarm/ingress/)
- [Docker Docs: View logs for a container or service](https://docs.docker.com/config/containers/logging/)
- [Docker Docs: Use volumes](https://docs.docker.com/storage/volumes/)
- [Docker Docs: Apply rolling updates to a service](https://docs.docker.com/engine/swarm/swarm-tutorial/rolling-update/)
- [Docker Docs: docker service create](https://docs.docker.com/engine/reference/commandline/service_create/)
- [Docker Docs: docker service update](https://docs.docker.com/engine/reference/commandline/service_update/)
