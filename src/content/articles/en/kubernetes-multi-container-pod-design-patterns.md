---
title: "Common Design Patterns for Multi-Container Pods"
description: "Sometimes Kubernetes needs multiple containers running together in one Pod. Here are the common design patterns for multi-container Pods."
pubDate: "2022-02-10T08:23:08.000Z"
tags: ["kubernetes"]
featureImage: "/content/images/2022/02/cover-8.png"
lang: en
---

## What is a multi-container Pod?

A **multi-container Pod** contains two or more different containers. Usually a Pod runs one process in one container, but it can also include supporting containers that assist the main process.

All containers within a Pod share the same network, IP address, and ports. Do not combine containers that use the same port in one Pod. Nor is grouping completely unrelated processes recommended: that conflicts with Kubernetes' design of distributing services by function and using Pods as the smallest deployment unit.

Consider a multi-container Pod when **the main process needs to run alongside containers that closely share its network or storage**. The following **Pod design patterns** distinguish these cases by purpose. They apply to a single Pod on a single node. Except for init containers, introduced last, they come from Google engineers Brendan Burns and David Oppenheimer's 2016 paper, ["Design patterns for container-based distributed systems"](https://www.usenix.org/system/files/conference/hotcloud16/hotcloud16_burns.pdf).

![Common multi-container Pod patterns include Sidecar, Adapter, and Ambassador.](/content/images/2022/02/pod-design-patterns.png)

Image source: [Matthew Palmer](https://matthewpalmer.net/kubernetes-app-developer/articles/multi-container-pod-design-patterns.html)

## Sidecar containers

A **sidecar container** is **a supporting container sharing a Pod's filesystem to enhance its functionality**. Many multi-container Pods in actual Kubernetes environments follow this pattern.

![A Pod containing a sidecar container](/content/images/2022/02/sidecar-container.png)

Image source: [Brendan Burns and David Oppenheimer's paper](https://www.usenix.org/conference/hotcloud16/workshop-program/presentation/burns)

Consider a sidecar collecting logs alongside Nginx:

1. A separate sidecar streams Nginx's latest logs inside the Pod.
2. It sends those logs to stdout or stderr.
3. A separate logging backend, logging agent Pod, or service such as logrotate accesses them.

Here is a minimal YAML implementation.

### Example YAML

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: nginx-sidecar
spec:
  containers:
  - name: nginx
    image: nginx
    ports:
    - containerPort: 80
    volumeMounts:
    - name: logs
      mountPath: /var/log/nginx
  - name: sidecar-access
    image: busybox
    args: [/bin/sh, -c, 'tail -n+1 -f /var/log/nginx/access.log']
    volumeMounts:
    - name: logs
      mountPath: /var/log/nginx
  - name: sidecar-error
    image: busybox
    args: [/bin/sh, -c, 'tail -n+1 -f /var/log/nginx/error.log']
    volumeMounts:
    - name: logs
      mountPath: /var/log/nginx
  volumes:
  - name: logs
    emptyDir: {}
```

- Two `busybox` containers accompany the `nginx` container.
- Each streams either `access.log` or `error.log` from `/var/log/nginx/` as a sidecar.
- Their startup configuration runs `tail -n+1 -f` to stream the logs.
- View those streams directly with `kubectl logs nginx-sidecar [container-name]`.

## Adapter containers

An **adapter container** usually adjusts the output format of an application in a Pod to suit another system's needs.

![A Pod containing an adapter container](/content/images/2022/02/adapter-container.png)

Image source: [Brendan Burns and David Oppenheimer's paper](https://www.usenix.org/conference/hotcloud16/workshop-program/presentation/burns)

Open-source applications serving similar purposes often produce different output formats. One server might log dates as `YYYY-MM-DD`, another as `DD/MM/YYYY`. These differences can cause problems when a collector aggregates their logs.

An adapter can normalize the output without changing the original application's container. **Adapter containers** provide compatibility among the outputs of otherwise heterogeneous applications.

### An adapter example

Use the following repository in Docker Desktop with Kubernetes enabled, or in an environment with minikube. [The original author's post](https://medium.com/bb-tutorials-and-thoughts/kubernetes-learn-adaptor-container-pattern-97674285983c) explains it in detail.

```bash
# Example source by Bhargav Bachina(@bbachi)
https://github.com/bbachi/k8s-adaptor-container-pattern.git
```

The complete Pod configuration, `pod.yml`, is:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: adapter-container-demo
spec:
  containers:
  - image: busybox
    command: ["/bin/sh"]
    args: ["-c", "while true; do echo $(date -u)'#This is log' >> /var/log/file.log; sleep 5;done"]
    name: main-container
    resources: {}
    volumeMounts:
    - name: var-logs
      mountPath: /var/log
  - image: bbachin1/adapter-node-server
    name: adapter-container
    imagePullPolicy: Always
    resources: {}
    ports:
      - containerPort: 3080
    volumeMounts:
    - name: var-logs
      mountPath: /var/log
  dnsPolicy: Default
  volumes:
  - name: var-logs
    emptyDir: {}
```

- The main container runs `busybox`. A `node` container using `bbachin1/adapter-node-server` receives its log output.
- Code in the Node container's `server.js` converts those logs to JSON.
- Converting specific logs or outputs into a common format is a typical use of an adapter.

## Ambassador containers

An **ambassador container simplifies access to services outside a Pod**. Its name reflects the way it conducts network communication on behalf of the main container.

![A Pod containing an ambassador container](/content/images/2022/02/ambassador-container.png)

Image source: [Brendan Burns and David Oppenheimer's paper](https://www.usenix.org/conference/hotcloud16/workshop-program/presentation/burns)

In this structure, the main container communicates externally only through the ambassador, and incoming access also goes through it. The ambassador is **a proxy responsible for the main container's networking**.

### An ambassador example

This example from [Magalix's technical blog](https://www.magalix.com/blog) uses a proxy container so that `redis` inside the Pod can access external Redis instances. [See the original post for details.](https://www.magalix.com/blog/kubernetes-patterns-the-ambassador-pattern)

The complete Pod definition is:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: ambassador-example
spec:
  containers:
  - name: redis-client
    image: redis
  - name: ambassador
    image: malexer/twemproxy
    env:
    - name: REDIS_SERVERS
      value: redis-st-0.redis-svc.default.svc.cluster.local:6379:1 redis-st-1.redis-svc.default.svc.cluster.local:6379:1
    ports:
    - containerPort: 6380
```

- The main process is `redis-client`, a Redis container acting as a client.
- The `ambassador` container proxies connections between Redis on port `6380` and the locations listed in `REDIS_SERVERS`.
- Those locations are `redis-st-0` and `redis-st-1`, Pods associated with `redis-svc`. This configuration therefore also needs a `redis-svc` Service and a StatefulSet named `redis-st`. We will cover those resources in the next article.

## Init containers

An init container **performs initialization before the main container starts**. It runs prerequisite tasks or checks conditions, ensuring they are complete before starting the main process.

Init containers differ from ordinary containers:

1. Each **must terminate** when its intended task finishes.
2. They cannot use `lifecycle` options or probes such as `livenessProbe`, `readinessProbe`, and `startupProbe`.
3. Multiple init containers start sequentially. The next starts only after the previous one **exits successfully**.
4. If one fails, **kubelet keeps restarting it until it succeeds**. If the Pod's `restartPolicy` is `Never`, however, the entire Pod is considered to have failed and processing stops.

These properties allow many uses, including prerequisite checks for **Pods with dependencies on other applications**.

### An init container example

Consider this example from the [Kubernetes documentation](https://kubernetes.io/docs/concepts/workloads/pods/init-containers/):

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: myapp-pod
  labels:
    app: myapp
spec:
  containers:
  - name: myapp-container
    image: busybox:1.28
    command: ['sh', '-c', 'echo The app is running! && sleep 3600']
  initContainers:
  - name: init-myservice
    image: busybox:1.28
    command: ['sh', '-c', "until nslookup myservice.$(cat /var/run/secrets/kubernetes.io/serviceaccount/namespace).svc.cluster.local; do echo waiting for myservice; sleep 2; done"]
  - name: init-mydb
    image: busybox:1.28
    command: ['sh', '-c', "until nslookup mydb.$(cat /var/run/secrets/kubernetes.io/serviceaccount/namespace).svc.cluster.local; do echo waiting for mydb; sleep 2; done"]
```

- Declare init containers separately under `spec.initContainers`. This example uses two.
- `init-myservice` prints `waiting for myservice` every two seconds until it discovers a Service named `myservice` in the same Namespace.
- `init-mydb` uses a similar shell script to wait for `mydb`.

Deploy `myapp-pod` and check it with `kubectl get`:

```bash
NAME        READY     STATUS     RESTARTS   AGE
myapp-pod   0/1       Init:0/2   0          2m
```

- Only `myapp-container` is declared in `spec.containers`, so `READY` shows `0/1`. It has not started.
- Instead of an ordinary status, `STATUS` shows `Init:0/2`: two init containers are configured and neither has finished.
- Running `kubectl logs myapp-pod <init-container-name>` shows `waiting for <service-name>`. With those Services absent, the init containers keep waiting.

Now satisfy their completion conditions. Define and deploy these Services with `kubectl apply -f`:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: myservice
spec:
  ports:
  - protocol: TCP
    port: 80
    targetPort: 9376
---
apiVersion: v1
kind: Service
metadata:
  name: mydb
spec:
  ports:
  - protocol: TCP
    port: 80
    targetPort: 9377
```

After checking that the Services are deployed, inspect `myapp-pod` again. Both `READY` and `STATUS` should show it running normally:

```bash
NAME        READY     STATUS    RESTARTS   AGE
myapp-pod   1/1       Running   0          5m
```

Init containers are useful for checking prerequisites before deploying a Pod with dependencies. Note, however, that once a Pod is `Running`, later changes to those prerequisites do not change that status unless the Pod is restarted.

## Closing

We have examined common design patterns for Pods containing two or more containers. They can improve the main container's functionality or reliability, or check dependencies.

Next, we will explore **Kubernetes' core workload resources**: ReplicaSets, Deployments, StatefulSets, and DaemonSets, along with Namespaces that logically divide where those resources run.

## References

- ["Design patterns for container-based distributed systems" by Brendan Burns and David Oppenheimer, Google (2016)](https://www.usenix.org/conference/hotcloud16/workshop-program/presentation/burns)
- [Multi-Container Pod Design Patterns in Kubernetes](https://matthewpalmer.net/kubernetes-app-developer/articles/multi-container-pod-design-patterns.html)
- [Kubernetes Patterns: The Ambassador Pattern](https://www.magalix.com/blog/kubernetes-patterns-the-ambassador-pattern)
- [Kubernetes Documentation: Init Containers](https://kubernetes.io/docs/concepts/workloads/pods/init-containers/)
- [Docker/Kubernetes online bootcamp with Kakao Enterprise](https://classlion.net/class/detail/21) (week 17 lectures)
