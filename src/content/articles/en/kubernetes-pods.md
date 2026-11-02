---
title: "Pods: The Concept, Their Lifecycle, and Health Checks with Probes"
description: "A detailed look at Pods, the smallest objects deployed in a Kubernetes cluster: their types, lifecycle, and health checks using probes."
pubDate: "2022-02-07T08:13:00.000Z"
updatedDate: "2022-02-10T08:17:32.000Z"
tags: ["kubernetes"]
featureImage: "/content/images/2022/02/cover-7.png"
lang: en
---

## Basic concepts

In Kubernetes, **a Pod is the smallest deployable object in a cluster, encapsulating one or more containers**. [A pod originally means a group of whales](https://www.whalefacts.org/what-is-a-group-of-whales-called/); the name comes from [Molly Dock, the whale in Docker's logo](https://www.networkworld.com/article/2942838/docker-the-container-company-with-a-whale-of-a-logo-adopted-a-real-whale.html#:~:text=The%20whale%20in%20Docker's%20logo,taking%20care%20of%20the%20whale.).

![The name Pod itself comes from Docker's whale imagery.](/content/images/2022/02/pods.jpg)

Pods have these characteristics:

1. A Pod contains **one or more containers**. Multiple containers can share a Pod as needed.
2. It receives **its own IP**, separate from the node IP, shared by its containers.
3. A Pod **generally has one IP**, though specific configurations such as [Multus CNI](https://github.com/k8snetworkplumbingwg/multus-cni) can give it two.
4. Its containers can connect to the same volumes.
5. It is the cluster's smallest deployment unit and runs within a Namespace.
6. It is inherently **ephemeral**.

Pay attention to the sixth point. Pods serving the same role may be placed on different nodes. If a node fails, its Pods may be moved to healthy nodes, and the number of Pods may change as needed. **Pods are disposable resources used to keep something running; they can be deleted at any time as circumstances require.**

## Single-container Pods

A **single-container Pod** contains exactly one container. Most Pods operated in Kubernetes clusters are of this type.

You can deploy one directly with `kubectl` in the CLI or use a YAML file containing its specification (`spec`). Suppose we want a Pod named `nginx` containing an `nginx` container.

### 1. Deploy through the CLI

Connect to the master node in a terminal and run:

```bash
kubectl run nginx --image=nginx
```

- The command takes the form `kubectl run [pod-name] --image=<image-name>`.
- `kubectl run` pulls the image specified by `--image`, then creates and starts a Pod with the specified name.
- `--image` is required. Without it, the Pod cannot be created.

### 2. Deploy with YAML

On the master node, save the following YAML at your preferred location and run `kubectl apply -f <filename.yaml>`:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: nginx
  labels:
    app: nginx
spec:
  containers:
  - name: nginx-container
    image: nginx
```

- `.apiVersion` specifies the Kubernetes API version used to create the object. It varies by object: Pods and Services use `v1`, while ReplicaSets and Deployments use `apps/v1`.
- `.metadata.labels` contains arbitrary key-value metadata that does not affect Pod operation. Thoughtful labeling helps you find and work with the right Pods when thousands are running.
- `.spec.containers` defines the containers inside the Pod. Much of it resembles Docker Compose configuration. In YAML, `-` marks a list item under its parent entry.

### 3. Useful Pod management commands

```bash
# List Pods in the cluster (default namespace)
kubectl get pods

# List Pods in a specific namespace
kubectl get pods -n <namespace>

# List Pod details, including private IPs and nodes
kubectl get pods -o wide

# Edit the nginx Pod
kubectl edit pod nginx

# Inspect the nginx Pod
kubectl describe pod nginx

# View logs for the container running in the nginx Pod
kubectl logs nginx

# Start an interactive sh session in the nginx Pod container
kubectl exec -it nginx -- /bin/sh

# Delete the nginx Pod
kubectl delete pod nginx
```

- The **Namespace** in the second command isolates workload resources within one cluster as needed. We will return to it in the article on workload resources.

### 4. A useful deployment tip

CLI commands are convenient for creating and deploying objects, but YAML files are preferable when you need to review and apply detailed configuration.

Adding `--dry-run=client` and `-o yaml` to a `kubectl` command **saves the basic YAML specification for that command to a file**. A file is generated only if the command can complete successfully. Since this produces a file without applying the command to the cluster, it is also useful for reviewing planned work.

```bash
# Generate a Redis Pod specification as YAML
kubectl run redis --image=redis --dry-run=client -o yaml > redis.yaml

# Start the Pod from the generated YAML (declarative)
kubectl apply -f redis.yaml

# Start the Pod from the generated YAML (imperative)
kubectl create -f redis.yaml
```

## Managing multi-container Pods

A **multi-container Pod** contains two or more different containers. One container per Pod is common, but containers that must remain together and share a lifecycle can be grouped in one Pod.

Containers deployed together this way:

1. Start and stop together according to the Pod's state, sharing its lifecycle.
2. Can communicate easily within the Pod.
3. Share its storage volumes.

Several practical **design patterns** have emerged for multi-container Pods. We will examine them in the next article.

### Deploy with YAML

Multi-container Pods must be deployed with YAML. As with a regular Pod, save the following and run `kubectl apply -f <filename.yaml>`:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: nginx-redis
  labels:
    app: nginx-redis
spec:
  containers:
  - name: nginx-container
    image: nginx
  - name: redis-container
    image: redis
```

- The basic format is the same as for a single-container Pod.
- List the containers under `spec.containers`.

### View logs and enter a container

For a multi-container Pod, specify the container name when viewing logs or entering a container:

```bash
# View logs for redis-container in the nginx-redis Pod
kubectl logs nginx-redis redis-container

# Start an interactive sh session in nginx-container of the nginx-redis Pod
kubectl exec -it nginx-redis nginx-container -- /bin/sh
```

## Pod lifecycle and restart policies

### Pod lifecycle

A Pod's lifecycle has **four broad phases**:

1. `Pending`: Pod creation has been accepted, but its containers have not fully started and it has not yet been placed on a node.
2. `Running`: The Pod has been placed on a node and all containers have been created. At least one is running or starting.
3. `Succeeded`: Seen when containers are designed to finish after a finite amount of work. All containers have completed successfully and exited.
4. `Failed`: Also associated with containers intended to finish finite work; at least one has exited abnormally.

Other status information (`.status.phase`) appears in special cases:

- `unknown`: The Pod's state cannot be determined, usually because of a node networking issue.
- `terminating`: Appears when deleting a Pod. Pods normally disappear after a thirty-second grace period; add `--force` to `kubectl delete` for immediate deletion. This is not treated as a lifecycle phase.

**kubelet** periodically monitors Pod lifecycle and status. You can see the result in the `STATUS` field of `kubectl get pods`, or inspect the object's `.status.phase` field:

```bash
kubectl get pod <pod-name> -o jsonpath='{.status.phase}'
```

### Container restart policies

Every container in a Pod has **a policy for restarting after an error**. There are three options, set through `spec.restartPolicy` in the Pod's YAML:

1. `Always`: Restart after either normal or abnormal exit. This is the **default**.
2. `Onfailure`: Restart only after abnormal exit.
3. `Never`: Do not restart.

Restarts occur after **a delay**, increasing exponentially from **ten seconds up to a maximum of three hundred seconds**. The first retry occurs after ten seconds, the next after twenty, then forty, and so on. If a restarted container runs without trouble for ten minutes, the delay resets.

## Checking container health with probes

How does Kubernetes check container health to apply these restart policies? Through **probes**, which let **kubelet** diagnose a container and determine whether it needs restarting or stopping.

### How probes work

Probes use three methods:

1. **HTTP:** Send an HTTP GET request and check for a 2XX or 3XX response.
2. **TCP:** Check whether a TCP [three-way handshake](https://velog.io/@averycode/%EB%84%A4%ED%8A%B8%EC%9B%8C%ED%81%AC-TCPUDP%EC%99%80-3-Way-Handshake4-Way-Handshake#-tcp%EC%9D%98-3-way-handshake) succeeds.
3. **Exec:** Run a command in the container and check for exit code zero.

Results are `Success`, `Failure`, or `Unknown` when diagnosis itself fails. **kubelet** detects a `Failure` and takes the appropriate action.

There are three main probe types: **liveness**, **readiness**, and **startup**.

![A flowchart showing how the probes operate.](/content/images/2022/02/probes-1.png)

Image source: [Andrew Lock](https://andrewlock.net/deploying-asp-net-core-applications-to-kubernetes-part-6-adding-health-checks-with-liveness-readiness-and-startup-probes/)

1. **Liveness probe:** Restarts a container when it detects that it has stopped or exited abnormally.
2. **Readiness probe:** Stops load balancing to a Pod when its container cannot handle requests, leaving the Pod itself alone.
3. **Startup probe:** Detects when a container has started successfully. Until then, it prevents liveness and readiness probes from running. Once startup succeeds, it finishes its role and hands health checking to the other probes.

### Type 1: Liveness probe

Using one of the three methods above, it checks whether the container is alive and ready to accept requests. On `Failure`, it **restarts the container**.

This helps maintain availability even when a container has internal problems. However, bugs causing bottlenecks or memory leaks can halt a process entirely, so care is needed.

This example configures an **Exec-based** liveness probe. Add it to the container specification under `spec.containers` in the deployment YAML:

```yaml
livenessProbe:
  exec:
    command:
    - cat
    - /tmp/healthy
  initialDelaySeconds: 5
  periodSeconds: 5
```

- After the five-second wait set by `initialDelaySeconds`, **kubelet** runs `cat /tmp/healthy` every five seconds as set by `periodSeconds`.
- If no probe is declared when creating the Pod or container, `Success` is assumed by default.
- To hold the probe until the container is fully `Running`, allow enough `initialDelaySeconds` or also use a **startup probe** as described below.

### Type 2: Readiness probe

This resembles liveness in its YAML definition and diagnostic methods. The difference is that a `Failure` **stops load balancing to the Pod**.

A Service distributes incoming requests among Pods. If one stops responding, it is considered unhealthy and its connection to the Service is removed to stop traffic reaching it. That is the readiness probe's role.

This **Exec-based** example is configured exactly like the liveness probe, except for the name `readinessProbe`:

```yaml
readinessProbe:
  exec:
    command:
    - cat
    - /tmp/healthy
  initialDelaySeconds: 5
  periodSeconds: 5
```

- Without an explicit probe at creation, `Success` is assumed.
- Liveness runs independently of readiness. Neither waits for the other to succeed, so configure them carefully when using both.

### Type 3: Startup probe

This probe **checks when the application inside a container has started**. If declared, it prevents liveness and readiness probes from activating until it returns `Success`.

The other probes consume Pod computing resources. Running them heavily from the beginning can delay the container and Pod reaching `Running`. The startup probe therefore handles diagnosis while keeping the other probes disabled until startup is considered complete.

By design, it initially tolerates checks that return `Failure`. The YAML specifies **how many failures are allowed**:

```yaml
startupProbe:
  httpGet:
    path: /health-check
    port: liveness-port
  failureThreshold: 30
  periodSeconds: 10
```

- This allows **thirty checks at ten-second intervals**, waiting up to five minutes, or three hundred seconds, for the Pod and application to reach `Running`.
- `startupProbe.failureThreshold` is the maximum allowed failure count.
- `startupProbe.periodSeconds` is the interval between checks in seconds.

Once successful startup is confirmed, the startup probe ends its checking loop and hands over to liveness and readiness.

## Closing

We have explored **Pods**, Kubernetes' smallest deployable objects and most fundamental workload resources, along with their lifecycle, container health checks through **probes**, and restart policies.

Next, we will examine common **design patterns for multi-container Pods**.

## References

- [Kubernetes Documentation: Pods](https://kubernetes.io/docs/concepts/workloads/pods/)
- [Kubernetes Documentation: Configure Liveness, Readiness and Startup Probes](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/)
- [Adding health checks with Liveness, Readiness, and Startup probes](https://andrewlock.net/deploying-asp-net-core-applications-to-kubernetes-part-6-adding-health-checks-with-liveness-readiness-and-startup-probes/)
- [Pod lifecycle and container probes](https://nearhome.tistory.com/89)
- [TCP/UDP and the three-way and four-way handshakes](https://velog.io/@averycode/%EB%84%A4%ED%8A%B8%EC%9B%8C%ED%81%AC-TCPUDP%EC%99%80-3-Way-Handshake4-Way-Handshake#-tcp%EC%9D%98-3-way-handshake)
- [Docker/Kubernetes online bootcamp with Kakao Enterprise](https://classlion.net/class/detail/21) (selected lectures from weeks 11 and 17)
