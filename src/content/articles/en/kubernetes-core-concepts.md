---
title: "Kubernetes, Container Orchestration, and the Ideas Behind Its Design"
description: "An introduction to container orchestration and the core design principles Kubernetes uses to implement it."
pubDate: "2022-01-31T11:45:00.000Z"
updatedDate: "2022-02-10T01:05:35.000Z"
tags: ["kubernetes"]
lang: en
---

## What is Kubernetes?

**Kubernetes** is an open-source **container orchestration** tool that simplifies large-scale deployment, scaling, and management of containerized applications.

Other tools, including Docker Swarm, Apache Mesos, and Nomad, have evolved toward the same goal of efficiently controlling containers at scale. As of 2022, however, Kubernetes has become **the de facto standard for container-based infrastructure**.

Kubernetes has a history of more than fifteen years of running production-scale workloads inside Google. This proven reliability and usefulness brought it to a dominant position in the market. The three major global cloud providers, AWS, Azure, and GCP, as well as Red Hat and VMware, already offer Kubernetes platforms optimized for their solutions. As public and private IT infrastructure moves rapidly to the cloud, understanding Kubernetes will become essential to working with the infrastructure that runs applications.

To understand what Kubernetes is for, we also need to understand **container orchestration**. I will first briefly explain the concept and why it became necessary, then look at **the core design principles Kubernetes uses to implement it**.

## What is container orchestration?

Red Hat describes orchestration in IT as [the automated configuration, management, and coordination of computer systems, applications, and services](https://www.redhat.com/en/topics/automation/what-is-orchestration). Applied to containers, we can understand container orchestration as automated configuration, management, and coordination of containerized applications.

In a microservices architecture (MSA), individual features within a project are built as small, separate services. Containers are commonly used to implement each service. An administrator might manage a small number of containers manually, but doing so for a large production project is impossible. **When hundreds or thousands of containers must be deployed and managed simultaneously, four questions need answers.**

1. **Deployment management:** Which container should run on which host? How can scheduling make the best use of each host's limited resources? How can that deployment be maintained with minimal effort?
2. **Control and monitoring:** How can we track and manage the state of each running container?
3. **Scaling:** How can we respond to constantly changing operating conditions and usage?
4. **Networking:** How can we connect all these instances and containers?

![Orchestration coordinates different elements reliably at the same time.](/content/images/2022/02/orchestration.jpg)

**Container orchestration** emerged to address these four issues. Just as musicians playing different parts coordinate in a single orchestral performance, orchestration reduces and automates the complexity of keeping large numbers of containers running reliably. Kubernetes is one tool that implements this concept.

## Five core design principles of Kubernetes

What distinctive design elements does Kubernetes provide for deploying and managing containers at scale? We can group them into five principles.

### 1. Declarative deployment configuration

Kubernetes primarily uses **declarations of a desired state** (for example, _keep five replicas on my host at all times_) rather than instructions to perform an action (_create five replicas_).

Kubernetes continually checks and updates whether the desired state matches the current state. Specifying the desired state of what you need allows it to deploy or change resources with an optimal placement suited to available host resources. If something fails, Kubernetes automatically takes the necessary steps to restore it to the desired state.

![Kubernetes continually monitors and manages resources to bring their current state into line with the desired state.](/content/images/2022/02/declarative.jpg)

Image source: [Leverage](https://www.leverege.com/iot-ebook/kubernetes-object-management-model)

### 2. Distribution by function

Kubernetes distributes individual functions into independent components. Controllers manage the major elements of a cluster, including Nodes, ReplicaSets, Deployments, and Namespaces, and are packaged within the [Kube Controller Manager](https://kubernetes.io/docs/reference/command-line-tools-reference/kube-controller-manager/).

![Kubernetes uses controllers to manage the state of its internal elements.](/content/images/2022/02/kube-controller.png)

Image source: [iximiuz.com](https://iximiuz.com/en/posts/kubernetes-operator-pattern/)

### 3. Centralized control at the cluster level

Kubernetes abstracts physical resources into clusters. A cluster contains a master node serving as its control plane, with authority over the components inside it. Administrators use this master node to control the entire cluster.

![Kubernetes is centrally controlled at the cluster level. Image source: Kubernetes Documentation.](/content/images/2022/02/cluster.png)

### 4. Dynamic grouping

Kubernetes components can carry arbitrary key-value pairs in queryable labels and metadata annotations. Administrators use a `selector` to manage components flexibly by label, and consult annotations to track information specific to each component.

![Labels allow components to be grouped flexibly.](/content/images/2022/02/labels.png)

Image source: [K21Academy](https://k21academy.com/docker-kubernetes/labels-and-annotations-in-kubernetes/)

### 5. API-based interaction

Kubernetes components are structured to access one another only through the Kubernetes API server, `kube-apiserver`. Every command executed through `kubectl` on the master node goes through this server. Cluster control components in the control plane, along with `kubelet` and proxies on worker nodes, also continually watch the API server.

![Many core Kubernetes components communicate through the API server.](/content/images/2022/02/apiserver.png)

Image source: [Sysdig](https://sysdig.com/blog/monitor-kubernetes-api-server/)

## Closing

We have introduced Kubernetes and container orchestration, then looked at the core ideas behind Kubernetes' design.

In the next article, we will explore the cluster, Kubernetes' central unit of control, and the main components of its control plane and nodes.

## References

- [Kubernetes Documentation: What is Kubernetes?](https://kubernetes.io/docs/concepts/overview/what-is-kubernetes/)
- [Red Hat Topics: What is orchestration?](https://www.redhat.com/en/topics/automation/what-is-orchestration)
- [Docker/Kubernetes online bootcamp with Kakao Enterprise](https://classlion.net/class/detail/21) (selected lectures from weeks 10-11)
