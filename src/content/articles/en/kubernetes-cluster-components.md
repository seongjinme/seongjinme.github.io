---
title: "Understanding Kubernetes Clusters and Their Components"
description: "A look at the cluster, the central unit of control in Kubernetes, and the main components of its control plane and nodes."
pubDate: "2022-02-02T07:05:00.000Z"
updatedDate: "2022-02-10T08:10:52.000Z"
tags: ["kubernetes"]
lang: en
---

## What is a Kubernetes cluster?

In Kubernetes architecture, **a cluster is a collection of physical or virtual nodes hosting containerized applications**.

[As introduced in the previous article](/en/kubernetes-core-concepts/), Kubernetes abstracts host resources into clusters. Each cluster has a master node that serves as the control plane for its internal components. Administrators control the entire cluster through this master node.

[Mumshad Mannambeth's Certified Kubernetes Administrator (CKA) preparation course](https://www.udemy.com/course/certified-kubernetes-administrator-with-practice-tests/), one of the best-known online Kubernetes courses, compares a cluster to a fleet. If a software container resembles a shipping container loaded onto a cargo ship, **a Kubernetes cluster resembles a fleet of container ships and a command ship managing them**.

![A Kubernetes cluster can be compared to a fleet of container ships and a command ship.](/content/images/2022/02/container-ships.jpg)

Cluster nodes fall into two broad roles: **worker nodes and master nodes**. In the fleet analogy:

- **Worker node:** A container ship carrying different containers. This is where containers with different purposes and functions are actually placed.
- **Master node:** The command ship directing the fleet. Running large numbers of containers requires optimal placement based on available resources, monitoring, and efficient tracking. A node performing these tasks is called a master node.

## Inside a Kubernetes cluster

[As discussed previously](/en/kubernetes-core-concepts/#5-api-based-interaction), Kubernetes is designed so that cluster components access one another only through the API server. With that in mind, let us examine its internal structure.

![Kubernetes cluster architecture](/content/images/2022/02/k8s-cluster.png)

Image source: [Sysdig](https://sysdig.com/blog/monitor-kubernetes-api-server/)

In this diagram, "Kubernetes Master" represents **the control plane on the master node**. The **control plane** deploys and controls major components, including workload resources, across the cluster. Its components include:

- **etcd:** A database storing information about cluster components as key-value pairs.
- **kube-scheduler:** A scheduler that determines optimal placement in the cluster for containers needed to run applications.
- **kube-controller-manager:** A collection of processes maintaining resources such as Nodes, Deployments, and ServiceAccounts.
- **DNS server:** The name server used to look up domains within the cluster. The diagram shows `kube-dns`, but Kubernetes replaced it with `CoreDNS` from version `1.12`.
- **kube-apiserver:** The component managing the Kubernetes API used for communication among cluster components.

The **"Node"** section at the top right contains the components needed to run Pods on a node. Both worker and master nodes have these components:

- **kubelet:** An agent on each node that monitors signals arriving through the API server and ensures containers in Pods function correctly.
- **kube-proxy:** A network proxy service running on each node.
- **Container runtime engine:** The engine running containers in the Pods deployed on a node. A Pod is the smallest deployable object in a cluster and contains one or more containers. We will examine it in the next article.

Finally, there is the command-line tool used to control the cluster:

- [**kubectl**](https://kubernetes.io/docs/reference/kubectl/overview/): A CLI tool for directly controlling the cluster and its components, used as `kubectl [command] [TYPE] [NAME] [flags]`.

## Control plane components

The master node manages containers and worker nodes through [control plane components](https://kubernetes.io/docs/concepts/overview/components/#control-plane-components). These are generally deployed as Pods in the cluster's `kube-system` namespace.

### etcd

**etcd is a database storing information about cluster components as key-value pairs.** It holds all the cluster's essential data.

Kubernetes records in **etcd** how many nodes exist, which containers each Pod holds, and where and how those Pods run. All information available through `kubectl` comes through **etcd**. Changes applied through control commands are updated there too.

If **etcd** is lost, information about all cluster components is lost with it. This makes etcd availability an essential consideration when building a cluster. [The official Kubernetes documentation describes two approaches](https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/ha-topology/), recommending at least three master nodes with control planes in either case.

1. **Stacked etcd topology:** Each control plane node also hosts an etcd Pod. This is simpler to implement and uses fewer infrastructure resources, but losing a node means losing both a control plane instance and an etcd member, affecting redundancy. Running more control plane nodes helps offset this and maintain availability.
2. **External etcd topology:** The etcd members corresponding to control plane nodes form a separate external cluster connected through `kube-apiserver`. This is less affected by the redundancy issue of the first approach, but needs a separate cluster of etcd members, consuming twice the infrastructure resources and cost.

The first approach is the default in `kubeadm`. Production environments are also commonly understood to favor it combined with an L4 switch. When a cluster installed using `kubeadm` follows this approach, etcd is deployed as an `etcd-master` Pod in `kube-system`.

### Scheduler (kube-scheduler)

**This process decides which node a Pod should be placed on.** Note that it only decides. The actual _placement_ is performed by **kubelet**, discussed below.

The scheduler prioritizes nodes in these stages. The criteria can be bypassed or changed as needed.

1. Filter nodes according to the Pod's computing resource requirements, such as CPU and memory.
2. Rank nodes according to the computing resources that would remain after placement.

The scheduler normally exists as a `kube-controller-scheduler-master` Pod in `kube-system`. Its YAML definition file depends on how the cluster was built:

- With `kubeadm`: `/etc/kubernetes/manifests/kube-scheduler.yaml`
- Otherwise: `/etc/systemd/system/kube-scheduler.service`

### Controller manager (kube-controller-manager)

**The controller manager monitors the various resources running in the cluster and manages them so that they function smoothly.**

It packages together controllers for Nodes, ReplicaSets, Deployments, StatefulSets, DaemonSets, ServiceAccounts, CronJobs, Namespaces, and other components. This follows Kubernetes' principle of [distribution by function](/en/kubernetes-core-concepts/#2-distribution-by-function).

The controller manager also exists as a `kube-controller-manager-master` Pod in `kube-system`. Its definition file is located at:

- With `kubeadm`: `/etc/kubernetes/manifests/kube-controller-manager.yaml`
- Otherwise: `/etc/systemd/system/kube-controller-manager.service`

### API server (kube-apiserver)

Kubernetes is built around the idea that all communication centers on the API. In principle, all its objects watch the API and communicate only through it. The **API server provides the central access point for monitoring cluster components and enabling their work**.

The API server is stateless. Instead of maintaining sessions, it checks data in etcd as needed to process work, and can scale horizontally through replication. It handles **authentication, request validation, data reception, etcd updates, scheduling, communication with kubelet, and more**. Its main functions include:

1. **API management:** Expose and manage the server's API. Kubernetes generally opens port `6443` for API access. Another approach uses the open-source HAProxy to forward access on port `16443` to the API server.
2. **Request processing:** Handle individual client API requests. These generally use HTTP, with some content represented as JSON.
3. **Internal control loops:** Perform background work needed for the API to operate, although the controller manager handles most such work.

The API server is also deployed as a Pod in `kube-system`. Its definition file is located at:

- With `kubeadm`: `/etc/kubernetes/manifests/kube-apiserver.yaml`
- Otherwise: `/etc/systemd/system/kube-apiserver.service.yaml`

#### How the API server operates in a cluster

Suppose we create a Pod with `kubectl`. The API server creates a Pod object and updates its information in `etcd`. Meanwhile, other components watch the API server and perform their own roles in response to the change. More specifically:

1. The API server creates a Pod object.
2. It updates `etcd` with the new Pod.
3. Watching the API server, the scheduler recognizes the new Pod and identifies a node for it.
4. The API server updates `etcd`.
5. The API server passes the information to `kubelet` on the appropriate node.
6. `kubelet` creates the Pod on that node and instructs the container runtime engine to deploy its application image.
7. `kubelet` updates the API server with its status, which the API server stores in `etcd`.

Many Kubernetes operations follow this general flow. For example, when `kubectl get` runs, the API server authenticates and checks the request, retrieves data from `etcd`, and returns it. This illustrates the API server's importance in operating and managing cluster components.

## Node components

Node components run and manage Pods and containers on each node. They exist on **master nodes as well as worker nodes**, because [control plane components](https://kubernetes.io/docs/concepts/overview/components/#control-plane-components) also run as individual Pods and need tools to manage them.

### kubelet

This agent **coordinates the containers in Pods on each node so that they run correctly**. Once the master node's scheduler assigns a Pod to a node, **kubelet places the Pod and its containers** there. It also periodically checks Pod and container status and reports results to the API server.

Note that **kubelet** is not included when building a cluster with `kubeadm`. It must be installed separately alongside `kubeadm` and `kubectl`. Their versions must match to avoid compatibility issues. See:

- [kubernetes.io: Installing kubeadm, kubelet and kubectl](https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/install-kubeadm/#installing-kubeadm-kubelet-and-kubectl)

### kube-proxy

**kube-proxy is the Kubernetes network proxy running on each node**. It creates and manages rules deciding which Pod receives internal or external traffic arriving at a Service. For this, `kubeadm` deploys one `kube-proxy` Pod per node as a DaemonSet. Check it with `kubectl get daemonset -n kube-system`.

**Pods are inherently ephemeral.** They may be placed on different nodes as needed, or replaced on other nodes when a node fails. Because node and Pod states continually change, their network IP addresses change too. **Services** provide a way to maintain networking among Pods in this environment.

A **Service is a virtual component that exposes an application running in Pods to the network**. Unlike a Pod or container, it has no concrete instance of its own; it only mediates network traffic between Pods. Think of it as a proxy implementation that tracks nodes and Pods and directs traffic where needed. It receives an internal cluster IP and acts like a gateway connecting Pods. **kube-proxy** is the process enabling Pods to access Services in this role.

The details of **kube-proxy** changed considerably around Kubernetes `1.20`. Previously it directly acted as a user-space proxy; more recently, its role has been limited to manipulating and managing netfilter through **iptables**.

#### Case 1: User-space proxy (before 1.20)

Suppose a client process sends a request for `10.3.241.152:80` through a Pod's `veth0` at `10.0.2.3`.

1. kube-proxy opens an arbitrary port, such as `10400`, on the `localhost` interface, such as `10.100.0.2`, to receive Service requests.
2. It configures netfilter in the physical server's kernel to route packets for the Service IP, `10.3.241.152:80`, to kube-proxy itself.
3. It forwards incoming requests to the actual server Pod's `<IP:Port>`, such as `10.0.2.2:8080`.

In this case, every Pod calls kube-proxy whenever it requests the Service IP. This increases host load and cost.

#### Case 2: Managing netfilter through iptables (after 1.20)

Here, kube-proxy delegates the proxy role entirely to netfilter. Netfilter looks up the Service IP and forwards traffic to Pods; kube-proxy merely updates its rules appropriately.

When Kubernetes creates a Service or Pod, changes a ReplicaSet, or makes another resource change, the corresponding controller detects it. The controller informs kube-proxy, which uses the Linux tool iptables to supply netfilter with updated traffic distribution rules.

### Container runtime engine

This is **the engine that pulls and runs container images inside the cluster**. A Pod cannot run on a node without it. As of Kubernetes `1.23`, Linux supports these runtimes. [See the official documentation for details and installation instructions.](https://kubernetes.io/docs/setup/production-environment/container-runtimes/)

- [containerd](https://containerd.io/)
- [CRI-O](https://cri-o.io/)
- Docker Engine (deprecated; scheduled for removal in `1.24`)
- [Mirantis Container Runtime](https://www.mirantis.com/software/container-runtime/)

#### Docker Engine support ends from v1.24

Kubernetes originally supported Docker as its runtime engine for creating and running containers. [In December 2020, it announced deprecation from version `1.20`.](https://kubernetes.io/ko/blog/2020/12/02/dont-panic-kubernetes-and-docker/) As of February 2022, Docker runtime support is [scheduled to end completely in the upcoming `1.24` release](https://github.com/kubernetes/enhancements/tree/master/keps/sig-node/2221-remove-dockershim), with alternatives such as `containerd` already in default use.

Removing Docker from supported runtimes does not mean Docker itself can no longer be used with Kubernetes clusters. Only runtime engine support is removed. Docker images follow the [Open Container Initiative (OCI)](https://opencontainers.org/), so the Linux Foundation's official position is that they will continue running through `containerd`, `CRI-O`, and similar runtimes without issue.

## Closing

We have examined a Kubernetes cluster's architecture and explored the major components of its control plane and nodes.

Next, we will look at the Pod, Kubernetes' smallest deployable object and its most fundamental workload resource.

## References

- [Understanding Kubernetes Architecture](https://arch.tkssharma.com/kubernetes-architecture-understanding/)
- [Kubernetes Documentation: Kubernetes Components](https://kubernetes.io/docs/concepts/overview/components/)
- [Kubernetes Documentation: Options for Highly Available Topology](https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/ha-topology/)
- [Kubernetes Documentation: Container runtimes](https://kubernetes.io/docs/setup/production-environment/container-runtimes/)
- [Kubernetes Blog: Don't Panic: Kubernetes and Docker](https://kubernetes.io/ko/blog/2020/12/02/dont-panic-kubernetes-and-docker/)
- [Docker/Kubernetes online bootcamp with Kakao Enterprise](https://classlion.net/class/detail/21) (selected lectures from weeks 10-12)
- [Mumshad Mannambeth's CKA preparation course](https://www.udemy.com/course/certified-kubernetes-administrator-with-practice-tests/) (selected material from section 2: Core Concepts)
