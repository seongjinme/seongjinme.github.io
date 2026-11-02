---
title: "Kubernetes Workload Resources and Namespaces"
description: "A look at ReplicaSets, Deployments, StatefulSets, DaemonSets, and the Namespaces that logically separate where they run."
pubDate: "2022-02-16T08:38:00.000Z"
tags: ["kubernetes"]
featureImage: "/content/images/2022/02/cover-9.png"
lang: en
---

## ReplicaSet

In production, an application rarely runs as just one Pod. Multiple Pods usually run simultaneously to provide a stable service without downtime. Pods running the same application are called **replicas**.

A **ReplicaSet** defines and manages the deployment specification for these Pods, **ensuring that the specified number always runs correctly**. If a Pod stops because of an error, it immediately deploys a new Pod with the same specification.

**Declarative configuration** is an important Kubernetes concept. **Instead of instructing an action, such as _create three Pods_, you declare a state to maintain: _keep three Pods running_.** A ReplicaSet is a representative implementation. If you declare three Pods and one is unexpectedly deleted or its node fails, a replacement is placed on an available worker node to maintain the declared state.

ReplicationControllers previously performed this role, but ReplicaSets replaced them as of Kubernetes `1.2`.

### Create a ReplicaSet

Create a ReplicaSet using YAML. Here is an example from the official Kubernetes documentation:

```yaml
apiVersion: apps/v1
kind: ReplicaSet
metadata:
  name: frontend
  labels:
    app: guestbook
    tier: frontend
spec:
  replicas: 3
  selector:
    matchLabels:
      tier: frontend
  template:
    metadata:
      labels:
        tier: frontend
    spec:
      containers:
      - name: php-redis
        image: gcr.io/google_samples/gb-frontend:v3
```

Watch the following points to avoid deployment errors:

- `apiVersion` is `apps/v1`. Unlike Pods and Services, objects managing multiple objects, such as ReplicaSets and Deployments, must specify `apps/v1`.
- The key-value pairs in `spec.selector.matchLabels` and `spec.template.metadata.labels` must match.

### Useful ReplicaSet commands

As with most Kubernetes objects, basic commands such as `get`, `describe`, and `delete` are available:

```bash
kubectl get rs
kubectl get replicaset

kubectl describe rs/frontend
kubectl edit rs/frontend

# Create a ReplicaSet
kubectl create -f replicaset.yaml

# Create or update a ReplicaSet
kubectl apply -f replicaset.yaml

# Apply the YAML file containing the ReplicaSet specification
kubectl replace -f replicaset.yaml

# Scale the ReplicaSet deployed from YAML to six replicas
kubectl scale --replicas=6 -f replicaset.yaml

# Scale the myapp ReplicaSet to six replicas
kubectl scale --replicas=6 replicaset myapp
```

## Deployment

A Deployment provides **declarative updates for Pods and ReplicaSets**, mainly for application version and deployment management, including rolling updates. A ReplicaSet checks Pods and maintains their count; a Deployment is **a higher-level object containing ReplicaSets**, used to manage an application or service.

Pods created by a Deployment have identifiers in the form `<deployment-name>-<replicaset-id>-<random-hash>`. These change when replica settings change or Pods are deleted and recreated. Pod identifiers within a Deployment are therefore fluid.

### Deploy a Deployment

#### Through the CLI

```bash
kubectl create deployment nginx --image=nginx:1.14.2 --replicas=3
```

- The format is `kubectl create deployment <deployment-name> --image=<image-name> --replicas=<count>`.
- It creates a Deployment with the specified name, creating and maintaining the number of Pods given by `--replicas`, using the image specified by `--image`.
- `--image` is required. If omitted, `--replicas` defaults to `1`.

#### Through YAML

On the master node, save the following YAML and run `kubectl apply -f <filename.yaml>`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-deployment
  labels:
    app: nginx
spec:
  replicas: 3
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
      - name: nginx
        image: nginx:1.14.2
        ports:
        - containerPort: 80
```

- `kind` must be `Deployment`, with exactly this capitalization.
- Set the replica count in `spec.replicas`.
- Pod information goes under `spec.template`, with container images under `spec.template.spec.containers`.
- Use key-value pairs in `spec.selector.matchLabels` to manage the deployed Pods together.
- Those pairs must match `spec.template.metadata.labels`.

### Change an existing Deployment

You may need to update container images or adjust replica counts in running Pods. Here is how. I will cover Deployment updates and rollbacks in more detail in another article.

#### Update the image

In the CLI, use `kubectl set`. This updates the `nginx` application's image in `nginx-deployment` from `nginx:1.14.2` to `nginx:1.16.1`:

```bash
kubectl set image deployment/nginx-deployment nginx=nginx:1.16.1
```

Alternatively, use `kubectl edit` to open the deployed Deployment's YAML and change `.spec.template.spec.containers[0].image`:

```bash
kubectl edit deployment/nginx-deployment
```

If you originally created it from YAML, edit `image` under `spec.template.spec.containers` to `nginx:1.16.1` and run `kubectl apply`.

#### Scaling

Use `kubectl scale` for a quick CLI adjustment. This immediately increases `nginx-deployment` to five replicas:

```bash
kubectl scale deployment/nginx-deployment --replicas=5
```

This explicitly changes the live object independently of the original YAML file. You can also use `kubectl edit` or modify and apply the deployment file, choosing whichever suits the purpose.

## StatefulSet

A StatefulSet is used to **store and manage application state**. Its Pod configuration, maintenance, and scaling resemble a Deployment, but it **guarantees each Pod's ordering and identity** and **assigns each its own persistent storage volume**.

### How it differs from a Deployment

1. Each Pod has a unique, persistent identifier.
2. A Pod retains that identifier when deleted and recreated.
3. Identifiers end with an ordinal number from zero to N-1, where N is the replica count.
4. Creation, scaling, updates, and deletion follow this order. Creation, scaling, and updates proceed sequentially; deletion proceeds in reverse.
5. Each Pod receives persistent storage. Its volume remains after deletion and is inherited by the replacement Pod.

### When do you need a StatefulSet?

Many microservices in Kubernetes are **stateless**. Consider an Nginx web server: it performs its role by responding to requests. Since all Pods have the same role, they can share one storage volume. If a Pod fails, an identical replacement is enough. A Deployment automates exactly this.

A database such as PostgreSQL, however, needs a more specialized design for data reliability and integrity. We might separate Pods that support all CRUD operations, Pods that only read, and Pods that monitor data integrity. Storage should also be separate for each Pod to improve reliability, and persist regardless of Pod status.

These **stateful** applications need capabilities a Deployment does not provide:

- Stable, unique network identifiers for individual Pods
- Stable, persistent storage
- Orderly placement and scaling of Pods and storage

The workload resource addressing these needs is a **StatefulSet**.

### Things to watch with StatefulSets

These characteristics introduce several considerations:

1. Creating a StatefulSet also creates a **Persistent Volume (PV)** for each Pod. Deleting the StatefulSet leaves these volumes behind.
2. Pod storage must use **PersistentVolumeClaims (PVCs)**, since new volumes must attach dynamically when Pods increase. Pre-provision [Persistent Volumes](https://kubernetes.io/docs/concepts/storage/persistent-volumes/) or use a [StorageClass](https://kubernetes.io/docs/concepts/storage/storage-classes/) for dynamic provisioning.
3. A **headless Service** is needed to direct requests to particular Pods. It is used only to locate their unique network identities, so it receives no separate IP, hence "headless."
4. A StatefulSet generally does not move Pods to another node when a node fails, prioritizing protection of volume data.

### Deploy a StatefulSet

StatefulSets are usually deployed through YAML. The basic format resembles a Deployment, with additional `spec.serviceName` and `spec.volumeClaimTemplates` entries:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: nginx-statefulset
  labels:
    app: nginx
spec:
  replicas: 3
  selector:
    matchLabels:
      app: nginx
  serviceName: "nginx"
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
      - name: nginx
        image: nginx:1.14.2
        ports:
        - containerPort: 80
          name: web
        volumeMounts:
        - name: www
          mountPath: /usr/share/nginx/html
  volumeClaimTemplates:
  - metadata:
      name: www
    spec:
      accessModes: [ "ReadWriteOnce" ]
      storageClassName: "my-storage-class"
      resources:
        requests:
          storage: 1Gi
```

- `kind` must be `StatefulSet`, with matching capitalization. Set the replica count in `spec.replicas`.
- `spec.serviceName` names the headless Service and is required.
- Pod information goes under `spec.template`, and container images under `spec.template.spec.containers`. Include volume information in `volumeMounts`.
- `spec.volumeClaimTemplates` describes volumes assigned to each Pod. The cluster administrator should have provisioned PVs beforehand. See [this document](https://kubernetes.io/docs/concepts/storage/storage-classes/).
- `spec.selector.matchLabels` and `spec.template.metadata.labels` must match.

Also create the required **headless Service**:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: nginx
  labels:
    app: nginx
spec:
  ports:
  - port: 80
    name: web
  clusterIP: None
  selector:
    app: nginx
```

- Set `metadata.name` to the same name declared in the StatefulSet's `spec.serviceName`.
- Set `spec.clusterIP` to `None`, since this Service has no IP of its own.
- The next article will explain Services in detail.

## DaemonSet

A DaemonSet runs **one identical Pod on every node, or on nodes with a specified label**.

Unlike a Deployment or StatefulSet, it places exactly one Pod on each matching node, so no replica configuration is needed. Adding a node to the cluster places a DaemonSet Pod there; removing a node does not move its DaemonSet Pod elsewhere.

DaemonSets commonly deploy resource monitoring applications or log collectors to worker nodes.

### Deploy a DaemonSet

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: fluentd-elasticsearch
  namespace: kube-system
  labels:
    k8s-app: fluentd-logging
spec:
  selector:
    matchLabels:
      name: fluentd-elasticsearch
  template:
    metadata:
      labels:
        name: fluentd-elasticsearch
    spec:
      containers:
      - name: fluentd-elasticsearch
        image: quay.io/fluentd_elasticsearch/fluentd:v2.5.2
        volumeMounts:
        - name: varlog
          mountPath: /var/log
        - name: varlibdockercontainers
          mountPath: /var/lib/docker/containers
          readOnly: true
      terminationGracePeriodSeconds: 30
      volumes:
      - name: varlog
        hostPath:
          path: /var/log
      - name: varlibdockercontainers
        hostPath:
          path: /var/lib/docker/containers
```

- `kind` must be `DaemonSet`, with matching capitalization.
- Pod information goes under `spec.template`.
- `spec.selector.matchLabels` and `spec.template.metadata.labels` must match.
- Use `spec.template.spec.tolerations` to place Pods on nodes with particular conditions. See [taints and tolerations](https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/).
- Use `spec.template.spec.nodeSelector` to target particular node labels. See [running Pods on selected nodes](https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/#running-pods-on-select-nodes).

## Namespace

Kubernetes supports **virtual clusters sharing the same physical cluster**, called **Namespaces**. They divide cluster resources among users or purposes. A Namespace is not itself a workload resource, but isolates workload resources within a cluster as needed.

### Why are Namespaces needed?

A project may run development, staging, production, and other environments simultaneously. Namespaces create isolated environments with their own policies and resource allocations without requiring separate physical hosts.

Resource names must be unique within a Namespace, but not across different Namespaces. Policies and resource calls are also scoped to Namespaces.

`kubectl get` lists resources only within the current Namespace. Unless another is selected, it lists resources in `default`.

### Initial Namespaces

- `default`: The default for objects without another Namespace.
- `kube-system`: Objects created by the Kubernetes system.
- `kube-public`: Readable by all users, including unauthenticated users. Generally reserved for publicly readable cluster resources, though this is a convention rather than a requirement.
- `kube-node-lease`: Lease objects associated with nodes, improving node heartbeat performance as the cluster scales.

### Manage Namespaces

```bash
# List Namespaces
kubectl get namespace -A

# Check the current Namespace
kubectl config view | grep namespace

# Add the test Namespace
kubectl create namespace test

# Change the active Namespace name
kubectl config set-context --current --namespace=<new-name>

# Delete the test Namespace
kubectl delete namespace test
```

- Be careful: deleting a Namespace **deletes all its objects and resources**. Deleting `kube-system` prevents the cluster from operating.

### Specify a Namespace for deployment or queries

Use `--namespace` or `-n`:

```bash
# Deploy an nginx Pod in the test Namespace
kubectl run nginx --image=nginx --namespace=test

# List Pods in the test Namespace
kubectl get pods -n test
```

### Select the Namespace used by the CLI

Use `kubectl config set-context` to persistently select the Namespace used by subsequent CLI commands. The initial setting is `default`.

```bash
# Set the Namespace for this CLI context
kubectl config set-context --current --namespace=test

# Check the currently selected default Namespace
kubectl config view --minify | grep namespace:
```

### Network communication across Namespaces

Pods in the same Namespace recognize one another through service names. To connect to another Namespace, identify the destination as `<service-name>.<namespace>.svc.cluster.local`.

For example, to call `db-service` in `dev`, use `db-service.dev.svc.cluster.local`.

## Closing

We have examined ReplicaSets, Deployments, StatefulSets, and DaemonSets, along with Namespaces that logically separate where these resources run.

Next, we will explore Kubernetes **Services** and their essential types.

## References

- [Kubernetes Documentation: Workloads](https://kubernetes.io/docs/concepts/workloads/)
- [Kubernetes Documentation: Namespaces](https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/)
- [Red Hat: Stateful vs. stateless](https://www.redhat.com/ko/topics/cloud-native-apps/stateful-vs-stateless)
- [Docker/Kubernetes online bootcamp with Kakao Enterprise](https://classlion.net/class/detail/21) (selected lectures from weeks 11-14)
