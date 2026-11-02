---
title: "Getting Started with Docker Swarm: Terminology, Activation, and Node Management"
description: "A beginner-friendly introduction to Docker Swarm terminology and setup, including building a multi-node cluster and managing its nodes."
pubDate: "2022-08-11T02:54:54.000Z"
updatedDate: "2022-08-18T07:55:34.000Z"
tags: ["docker"]
lang: en
---

## Overview

Docker is useful for managing containerized applications on one host. A single-host environment, however, has limitations in **scalability**, **availability**, and **fault tolerance**. What if growing usage exhausts the host's resources? What if the host temporarily stops working? The application would likely become unavailable immediately. Except for small applications such as a personal blog, multiple hosts are therefore commonly used to prepare for these situations.

Managing containers across hosts introduces problems Docker alone cannot easily solve:

- How do we connect and manage the hosts?
- Which container should run on which host?
- How do containers on different hosts communicate?

These questions may look familiar. **Container orchestration**, automated configuration, management, and coordination of containerized applications, emerged to address them. We explored it in ["Kubernetes, Container Orchestration, and the Ideas Behind Its Design"](/en/kubernetes-core-concepts/).

Docker also provides its own orchestration tool: **Docker Swarm**.

### Why Docker Swarm now?

Docker Swarm has effectively entered maintenance mode. Its future has been uncertain since Mirantis acquired Docker's enterprise platform business in November 2019. In February 2022, Mirantis [announced continued maintenance of SwarmKit within Docker Engine](https://www.mirantis.com/blog/our-commitment-to-open-source/), perhaps responding to those concerns, but substantial changes are difficult to expect.

With Kubernetes established as the de facto orchestration standard, Swarm may no longer be an attractive choice. Still, as an infrastructure learner, I noticed these advantages:

- It provides **enough functionality to run containerized applications** on small and medium multi-host clusters, even if not as much as Kubernetes.
- Wherever Docker Engine is installed, **activating Swarm mode requires no additional setup cost**.
- Docker Compose users can **quickly adapt to operating applications through stacks**.
- Docker Desktop can immediately create a single-node cluster supporting both management and deployment, letting you **experiment with orchestration using minimal resources**.

A low entry barrier and a simple structure make quick experimentation a substantial advantage for learners. Understanding Swarm should also help when working with enterprise tools such as Kubernetes later.

## Key terminology

Before starting, let us define the terms used throughout this introduction.

- **Node:** An individual Docker server in the cluster.
- **Manager node:** Handles cluster management and orchestration, comparable to a Kubernetes master node.
- **Worker node:** Runs containerized Services. Unlike Kubernetes, Swarm managers can also act as workers by default, though scheduling can be disabled.
- **Stack:** A multi-container application comprising one or more Services, deployed through YAML resembling Compose files.
- **Service:** An object defining a group of containers to run in the cluster and the work they perform. It is Swarm's basic deployment unit. Each Service uses one image and acts as an individual microservice in the application.
- **Task:** Swarm creates and distributes containers to nodes according to a Service's requirements. A Task is this deployment unit. A Service has as many Tasks as its replica count, each containing one container.
- **Scheduling:** Assigning Tasks to nodes according to Service specifications. As of August 2022, [Swarm supports only spread scheduling](https://docs.docker.com/engine/swarm/services/#control-service-placement). Node settings and labels can restrict eligible nodes.

## Start Docker Swarm

We will build **a three-node cluster** using three AWS `t2.micro` instances running `Ubuntu 22.04`. Each has one vCPU and 1 GiB of RAM, sufficient for a short exercise.

### Prerequisites

Each host needs Docker Engine `1.12` or later, with these ports available. On AWS, create and apply a Security Group containing:

- `2377/tcp`: Cluster management
- `7946/tcp`, `7946/udp`: Communication between nodes
- `4789/udp`: Ingress overlay network traffic

Alongside [installing Docker](https://docs.docker.com/desktop/install/linux-install/), I ran these commands on each host for easier management:

```bash
# These commands assume Ubuntu.
# Use sjhong-node-## hostnames to distinguish hosts.
sudo hostnamectl set-hostname <node-name>

# Allow the default ubuntu account to run Docker without sudo.
sudo usermod -aG docker ubuntu

# Reboot the host to apply the changes.
sudo reboot
```

### Activate Swarm mode

Swarm is integrated into Docker Engine. With Docker installed, one command starts Swarm mode:

```bash
docker swarm init
```

This creates a single-node cluster from the current host. To initialize it using a particular IP:

```bash
docker swarm init --advertise-addr <manager-node-IP>
```

Swarm distinguishes **manager** and **worker** nodes. This command activates the host identified by `--advertise-addr` as the new cluster's manager.

Successful activation prints:

```bash
Swarm initialized: current node ({node_id}) is now a manager.

To add a worker to this swarm, run the following command:

    docker swarm join --token {token} {ipaddress}:2377

To add a manager to this swarm, run 'docker swarm join-token manager' and follow the instructions.
```

Run `docker info` to confirm. `Server.Swarm` should now be `active`:

![Swarm mode is active.](/content/images/2022/08/swarm-active.png)

## Build a cluster

### Single-node cluster

List the nodes. You should see a single-node cluster containing the manager just activated:

```bash
ubuntu@sjhong-node-01:~$ docker node ls

ID                            HOSTNAME         STATUS    AVAILABILITY   MANAGER STATUS   ENGINE VERSION
sjhong-node-01-25char-ids *   sjhong-node-01   Ready     Active         Leader           20.10.17
```

Docker Desktop can create a single-node cluster just as quickly. Note that **Docker Desktop on Mac or Windows cannot create a multi-node cluster** in this way.

### Multi-node cluster

Add nodes using `docker swarm join` with a **token**. The token differs depending on the node role. Only the first node needs `docker swarm init`; do not initialize the others separately.

Recall this part of the first initialization output:

```bash
To add a worker to this swarm, run the following command:

    docker swarm join --token {token} {ipaddress}:2377
```

It contains the worker join command. On the host you want to add, install Docker Engine, open the required ports, and run it. The message `This node joined a swarm as a worker.` confirms success:

```bash
ubuntu@sjhong-node-02:~$ docker swarm join --token {token} {ipaddress}:2377

# The following message confirms that the node joined.
This node joined a swarm as a worker.
```

To add a manager, return to the existing manager and run `docker swarm join-token manager`. Use its separate token in `docker swarm join` on the new host:

```bash
# Request a manager join token.
ubuntu@sjhong-node-01:~$ docker swarm join-token manager
To add a manager to this swarm, run the following command:

    docker swarm join --token {token} {ipaddress}:2377

# Connect to the new manager host and run the command above.
ubuntu@sjhong-node-03:~$ docker swarm join --token {token} {ipaddress}:2377

# The following message confirms that the node joined.
This node joined a swarm as a manager.
```

To retrieve only a worker or manager token, add `--quiet`:

```bash
ubuntu@sjhong-node-01:~$ docker swarm join-token --quiet worker
SWMTKN-1-3h415tip2x8wh4xyv9g3uel3sp6ldrgsayusfvf4ebb8b36gn1-e5pshwokqu9u1o05wzh3t3rde
```

## Inspect node information

### Inspect a particular node

Use `docker node inspect <node-ID-or-hostname>`. Without extra flags, it returns a long JSON document:

![Node details in JSON](/content/images/2022/08/node-inspect-json.png)

Add `--pretty` for more readable output:

```bash
# Use self instead of a node ID to inspect the current node.
ubuntu@sjhong-node-01:~$ docker node inspect self --pretty
```

![Node details in a more readable format](/content/images/2022/08/node-inspect-pretty.png)

### List nodes

Back on the manager, `sjhong-node-01`, list the cluster's nodes:

```bash
ubuntu@sjhong-node-01:~$ docker node ls

ID                            HOSTNAME         STATUS    AVAILABILITY   MANAGER STATUS   ENGINE VERSION
sjhong-node-01-25char-ids *   sjhong-node-01   Ready     Active         Leader           20.10.17
sjhong-node-02-25char-ids     sjhong-node-02   Ready     Active                          20.10.17
sjhong-node-03-25char-ids     sjhong-node-03   Ready     Active         Reachable        20.10.17
```

`docker node ls` shows `ID`, `HOSTNAME`, `STATUS`, `AVAILABILITY`, and `MANAGER STATUS`. The `*` beside an ID marks the node running the command.

**ID is the unique value assigned to each node by the cluster. HOSTNAME is the host's name.** These differ: hostnames can repeat in a Swarm cluster. Conversely, a host that leaves and rejoins receives a new ID. **ID, rather than HOSTNAME, is the crucial way to distinguish nodes.**

`AVAILABILITY` describes the node's current availability:

- `Active`: Can receive Tasks normally.
- `Pause`: Receives no new Tasks, while existing ones keep running.
- `Drain`: Receives no new Tasks; existing ones terminate and are rescheduled on other `Active` nodes.

Only managers have `MANAGER STATUS`. The first manager above is `Leader`. Possible values are:

- `Leader`: Manages the Swarm cluster and its orchestration.
- `Reachable`: Communicates normally with other managers and can be elected leader if the current leader fails.
- `Unavailable`: Cannot communicate with other managers, including the leader. Restore it, promote a worker, or add another manager.

A cluster can have one or more managers, but the selected leader performs actual cluster-wide management. **All changes propagate through the leader, and the other nodes stay synchronized with it.** This uses the [**Raft consensus algorithm**](https://raft.github.io/) for high availability, allowing healthy nodes to keep a multi-node cluster functioning when some nodes fail.

## Manage nodes

### Change node roles

`docker node` provides `promote` and `demote` to change worker and manager roles.

Currently `sjhong-node-01` and `sjhong-node-03` are managers. Promote worker `sjhong-node-02`:

```bash
ubuntu@sjhong-node-01:~$ docker node promote sjhong-node-02
Node sjhong-node-02 promoted to a manager in the swarm.

ubuntu@sjhong-node-01:~$ docker node ls

ID                            HOSTNAME         STATUS    AVAILABILITY   MANAGER STATUS   ENGINE VERSION
sjhong-node-01-25char-ids *   sjhong-node-01   Ready     Active         Leader           20.10.17
sjhong-node-02-25char-ids     sjhong-node-02   Ready     Active         Reachable        20.10.17
sjhong-node-03-25char-ids     sjhong-node-03   Ready     Active         Reachable        20.10.17
```

All three are now managers. Keep only `sjhong-node-01` as manager and demote the others together. `promote` and `demote` can change several nodes at once:

```bash
ubuntu@sjhong-node-01:~$ docker node demote sjhong-node-02 sjhong-node-03

# Both nodes are now workers.
Manager sjhong-node-02 demoted in the swarm.
Manager sjhong-node-03 demoted in the swarm.
```

You can also use `update --role`, though it changes only one node at a time:

```bash
# docker node promote sjhong-node-02
docker node update --role manager sjhong-node-02

# docker node demote sjhong-node-02
docker node update --role worker sjhong-node-02
```

The cluster's last manager cannot be demoted or removed:

```bash
ubuntu@sjhong-node-01:~$ docker node demote sjhong-node-01

# A FailedPrecondition error is printed.
Error response from daemon: rpc error: code = FailedPrecondition desc = attempting to demote the last manager of the swarm
```

#### Errors during demotion

Very occasionally, demoting several nodes together produces:

```bash
ubuntu@sjhong-node-01:~$ docker node demote sjhong-node-02 sjhong-node-03

# Node 02 was successfully demoted to a worker.
Manager sjhong-node-02 demoted in the swarm.

# However, processing node 03 produced this error.
Error response from daemon: rpc error: code = FailedPrecondition desc = can't remove member from the raft: this would result in a loss of quorum
```

Try demoting `sjhong-node-03` again. Unlike before, it should complete:

```bash
# Try demoting node 03 again.
ubuntu@sjhong-node-01:~$ docker node demote sjhong-node-03

# This time, node 03 was successfully demoted too.
Manager sjhong-node-03 demoted in the swarm.
```

From [SwarmKit's role-changing code](https://github.com/moby/swarmkit/blob/master/manager/controlapi/node.go#L199), this error appears intended to prevent actions affecting the **Raft quorum** needed for high availability among managers. Personally, I think this check is unnecessary for demotion: demoting lowers the required quorum rather than threatening it. [An issue discussed and fixed in 2016](https://github.com/moby/moby/issues/23903) already addressed this, so why it still happens intermittently is unclear.

![Wait... what exactly is a quorum?](/content/images/2022/08/wait-what.jpg)

This new term may be confusing, but let us move on for now. **Raft quorum** will appear repeatedly in node management. The next article will explain it in detail.

### Change node availability

Maintenance or upgrades may require stopping new assignments or moving existing Tasks elsewhere. Use `docker node update --availability`:

```bash
docker node update --availability <state> <node>
```

Specify the desired state, `active`, `pause`, or `drain`, followed by the target node ID or hostname:

```bash
ubuntu@sjhong-node-01:~$ docker node update --availability drain sjhong-node-01

# Success prints the target node hostname.
sjhong-node-01

# Listing nodes now shows node 01 as Drain.
ubuntu@sjhong-node-01:~$ docker node ls

ID                            HOSTNAME         STATUS    AVAILABILITY   MANAGER STATUS   ENGINE VERSION
sjhong-node-01-25char-ids *   sjhong-node-01   Ready     Drain          Leader           20.10.17
sjhong-node-02-25char-ids     sjhong-node-02   Ready     Active                          20.10.17
sjhong-node-03-25char-ids     sjhong-node-03   Ready     Active                          20.10.17
```

Managers can normally run Tasks like workers. **A drained manager receives no new Tasks and moves existing ones to other nodes**, leaving only cluster management duties. This resembles a Kubernetes master with the `master:NoSchedule` taint.

However, **containers started directly with docker run or docker compose up remain running even in Drain**. Swarm does not manage them; they belong to that individual host.

### Label nodes

Assign labels as **`key=value`** or **`key`**. Later, Service scheduling can use them. For example, a Redis Service could be restricted to nodes labeled `type=redis`.

Use one `--label-add` flag per label with `docker node update`:

```bash
# Add the key foo and key=value label type=redis to sjhong-node-03.
ubuntu@sjhong-node-01:~$ docker node update --label-add foo --label-add type=redis sjhong-node-03

# Inspect the added node labels.
ubuntu@sjhong-node-01:~$ docker node inspect sjhong-node-03 --pretty | grep -i labels: -A 2

# The requested labels are present.
Labels:
 - foo
 - type=redis
```

Remove unwanted labels with `--label-rm`:

```bash
# Remove the foo label from sjhong-node-03.
ubuntu@sjhong-node-01:~$ docker node update --label-rm foo sjhong-node-03
```

As far as I have confirmed, labels can be assigned only after joining the cluster, not during `docker swarm join` or `init`. That is disappointing.

### Remove nodes from the cluster

#### Remove a worker

A manager cannot directly remove another running node. The usual procedure is:

1. Drain the target and check that its Tasks moved successfully.
2. On that node, run `docker swarm leave` to disconnect it.
3. On a manager, run `docker swarm rm <target-node>`.

Step 1 is nearly optional because `leave` includes draining. I recommend it nonetheless, to check that other available nodes can run the Tasks rather than leaving them `PENDING`.

After step 2, the node remains in the manager's list as a disconnected, `Down` node. Step 3 completes its removal.

Let us use worker `sjhong-node-03`. On a manager, drain it:

```bash
ubuntu@sjhong-node-01:~$ docker node update --availability drain sjhong-node-03
```

Check where its Tasks moved. Swarm deploys applications as **Services**, assigning **containers based on the Service image as Tasks on nodes**. `docker service ps` shows those assignments:

```bash
# Assume an nginx Service deployed with three replicas.

# After draining node 03,
# check which nodes host the running nginx Tasks.
# Combine -f and --format to display only the needed information.

ubuntu@sjhong-node-01:~$ docker service ps -f "desired-state=running" --format "{{.Name}}: {{.Node}}" nginx

# The nginx Tasks have moved to nodes 01 and 02 and are running.
nginx.1: sjhong-node-01
nginx.2: sjhong-node-02
nginx.3: sjhong-node-01
```

Now connect to node `03` and run `docker swarm leave`. Swarm mode deactivates there, and the scheduler stops assigning Tasks. Existing Tasks move to other available nodes, or stay `PENDING` if none are available:

```bash
ubuntu@sjhong-node-03:~$ docker swarm leave

# A terse message says the node left the swarm.
Node left the swarm.
```

Back on a manager, list nodes:

```bash
ubuntu@sjhong-node-01:~$ docker node ls

ID                            HOSTNAME         STATUS    AVAILABILITY   MANAGER STATUS   ENGINE VERSION
sjhong-node-01-25char-ids *   sjhong-node-01   Ready     Drain          Leader           20.10.17
sjhong-node-02-25char-ids     sjhong-node-02   Ready     Active                          20.10.17
sjhong-node-03-25char-ids     sjhong-node-03   Down      Active                          20.10.17
```

`sjhong-node-03` remains listed, but with `STATUS` changed to `Down`. It is now an independent Docker server disconnected from the cluster.

Run `docker node rm <node-name>` to finish:

```bash
ubuntu@sjhong-node-01:~$ docker node rm sjhong-node-03
sjhong-node-03

ubuntu@sjhong-node-01:~$ docker node ls

ID                            HOSTNAME         STATUS    AVAILABILITY   MANAGER STATUS   ENGINE VERSION
sjhong-node-01-25char-ids *   sjhong-node-01   Ready     Drain          Leader           20.10.17
sjhong-node-02-25char-ids     sjhong-node-02   Ready     Active                          20.10.17
```

If the worker is inaccessible or must otherwise be forcibly removed, add `--force`:

```bash
ubuntu@sjhong-node-01:~$ docker node rm --force sjhong-node-03
sjhong-node-03
```

#### Remove a manager

**Demote a manager before removing it.** The rest follows the worker procedure. At least one manager must remain; the final manager cannot be demoted or removed.

1. **Demote the target to a worker.**
2. Drain it and check Task relocation.
3. Run `docker swarm leave` on it.
4. Run `docker swarm rm <target-node>` on a manager.

Running `leave` without demotion produces an error. The wording varies with the remaining manager count, but includes terms such as `lost consensus` and `Raft quorum`:

```bash
ubuntu@sjhong-node-03:~$ docker swarm leave
Error response from daemon: You are attempting to leave the swarm on a node that is participating as a manager. The only way to restore a swarm that has lost consensus is to reinitialize it with `--force-new-cluster`. Use `--force` to suppress this message.
```

As the error suggests, `--force` can detach a manager directly. **I strongly advise against it.** Why? Let us experiment.

#### What happens when you forcibly remove a manager node

**First, suppose all three nodes are managers.** We saw the result of `leave` on `sjhong-node-03` above; now add `--force`:

```bash
ubuntu@sjhong-node-03:~$ docker swarm leave --force
Node left the swarm.
```

List nodes from another manager:

```bash
ubuntu@sjhong-node-01:~$ docker node ls
ID                            HOSTNAME         STATUS    AVAILABILITY   MANAGER STATUS   ENGINE VERSION
sjhong-node-01-25char-ids *   sjhong-node-01   Ready     Active         Leader           20.10.17
kb57zh7jenb45p6pwgyg0roi1     sjhong-node-02   Ready     Active         Reachable        20.10.17
y8rcglngmyfsint6vljzrvj6h     sjhong-node-03   Down      Active         Unreachable      20.10.17
```

One of three managers, `sjhong-node-03`, is `Down`, but the other two work normally. Cluster management still functions, and a newly deployed Service schedules and runs successfully.

![... So there is no problem?](/content/images/2022/08/no-problem.jpg)

**Now suppose only two of the three nodes, 01 and 03, are managers.** Running `leave` on `sjhong-node-03` produces:

```bash
ubuntu@sjhong-node-03:~$ docker swarm leave

Error response from daemon: You are attempting to leave the swarm on a node that is participating as a manager. Removing this node leaves 1 managers out of 2. Without a Raft quorum your swarm will be inaccessible. The only way to restore a swarm that has lost consensus is to reinitialize it with `--force-new-cluster`. Use `--force` to suppress this message.
```

This more alarming warning concerns **Raft quorum**. Reducing two managers to one would lose quorum and stop the cluster functioning; it says the only recovery is forcibly reinitializing the cluster.

What happens if we proceed? `docker swarm leave --force` on `03` prints `Node left the swarm.` as before. After some time, switch to `01` and list nodes. The result is unexpected:

```bash
ubuntu@sjhong-node-01:~$ docker node ls

# Management commands no longer work. Queries, changes, and scheduling have stopped.
Error response from daemon: rpc error: code = Unknown desc = The swarm does not have a leader. It's possible that too few managers are online. Make sure more than half of the managers are online.
```

![... It was fine before, but this time it died?](/content/images/2022/08/sorry-i-killed-the-cluster.jpg)

Only one of two managers in a three-node cluster has disappeared, yet **cluster management has stopped completely**, even though a healthy manager remains.

## Closing

We have introduced Swarm terminology, built a cluster, managed nodes, and experimented with forcibly removing managers. Why can three managers tolerate losing one, while two cannot? That can be hard for a beginner to understand.

The explanation lies in **Raft consensus** and **quorum**. The next article will explore Raft.

## References

- [Docker Docs: How nodes work](https://docs.docker.com/engine/swarm/how-swarm-mode-works/nodes/)
- [Docker Docs: Create a swarm](https://docs.docker.com/engine/swarm/swarm-tutorial/create-swarm/)
- [Docker Docs: Join nodes to a swarm](https://docs.docker.com/engine/swarm/join-nodes/)
- [Docker Docs: Drain a node on the swarm](https://docs.docker.com/engine/swarm/swarm-tutorial/drain-node/)
- [Docker Docs: Manage nodes in a swarm](https://docs.docker.com/engine/swarm/manage-nodes/)
- [Docker Docs: Raft consensus in swarm mode](https://docs.docker.com/engine/swarm/raft/)
