---
title: "Essential Kubernetes Service Types"
description: "Pods receive changing internal IP addresses whenever they are created. Kubernetes Services let applications running in those Pods communicate with the outside world."
pubDate: "2022-02-23T08:51:00.000Z"
tags: ["kubernetes"]
featureImage: "/content/images/2022/02/cover-10.png"
lang: en
---

## What is a Service?

In Kubernetes, **a Service is a virtual component that exposes an application running in Pods to the network**. It lets other cluster objects connect to the application, and lets the application connect to external applications and users.

Why is this necessary? Because Pods running applications in a cluster are ephemeral. [As discussed in the Pod article](/en/kubernetes-pods/), **Pods are disposable resources used to keep something running**. They can be moved to another node or deleted at any time. Each newly created Pod receives a new internal IP, making that address alone unsuitable for maintaining communication inside or outside the cluster.

Kubernetes therefore uses Services with stable internal IPs **to let Pods communicate externally**. A Service also provides **a single network entry point** for multiple Pods running the same application, as in a Deployment or StatefulSet.

When defining a Service, specify two ports for each connection under `spec.ports`. These names are written from the perspective of the Service forwarding cluster traffic:

- `targetPort`: The port open on the Pod's application. Incoming Service traffic goes to `<Pod-internal-IP>:<targetPort>`.
- `port`: The port exposed on the Service for that connection.

## Service types

Kubernetes defines [four broad Service types](https://kubernetes.io/docs/concepts/services-networking/service/#publishing-services-service-types). If `type` is omitted from the specification, it defaults to `ClusterIP`.

1. ClusterIP, the default
2. NodePort
3. LoadBalancer
4. ExternalName

### 1. ClusterIP, the default

**ClusterIP** is a virtual, cluster-only IP that lets **Pods communicate with other cluster resources**. It forwards internal traffic arriving at `<ClusterIP>` to `<Pod-IP>:<targetPort>`, so it is **accessible only within the cluster**. This is Kubernetes' default Service type.

![Architecture of a ClusterIP Service](/content/images/2022/02/clusterip.png)

Image source: [Google Cloud](https://medium.com/google-cloud/kubernetes-nodeport-vs-loadbalancer-vs-ingress-when-should-i-use-what-922f010849e0)

#### With a selector

This defines a `ClusterIP` Service named `myapp-service` for Pods listening on TCP port `9376` and sharing the labels `app=myapp, type=frontend`:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: myapp-service
spec:
  type: ClusterIP		# Optional
  ports:
  - protocol: TCP
    targetPort: 9376	# Port exposing the application (Pod)
    port: 80			# Port exposing the Service
  selector:				# Select matching Pods (optional but recommended)
    app: myapp
    type: frontend
```

When several Pods match `spec.selector`, the Service selects them as endpoints and distributes incoming requests among them. The same Service can therefore serve multiple Pods on one node or across several nodes.

Sometimes multiple ports are needed, such as HTTP and HTTPS. Add named list entries to `spec.ports`. Each `name` must contain only **lowercase letters, digits, and hyphens**, starting and ending with **a lowercase letter or digit**.

```yaml
apiVersion: v1
kind: Service
metadata:
  name: myapp-service
spec:
  type: ClusterIP
  ports:
  - name: http
    protocol: TCP
    targetPort: 9376
    port: 80
  - name: https
    protocol: TCP
    targetPort: 9377
    port: 443
  selector:
    app: myapp
    type: frontend
```

#### Without a selector

Sometimes endpoints must be specified manually. Test and production configurations might differ, or you may need to connect Services to reach Pods in another Namespace or cluster.

Create a Service without `spec.selector`, then create an Endpoints object and map it to the Service:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: myapp-service
spec:
  ports:
    - protocol: TCP
      port: 80
      targetPort: 9376
```

```
apiVersion: v1
kind: Endpoints
metadata:
  name: myapp-service		# Use the target Service name in metadata
subsets:					# Specify endpoints for this Service
  - addresses:
      - ip: 192.0.2.42
    ports:
      - port: 9376
```

Endpoint IPs must not be loopback (`127.0.0.0/8`) or link-local (`169.254.0.0/16, 224.0.0.0/24`) addresses. [See the official documentation for details.](https://kubernetes.io/docs/concepts/services-networking/service/#services-without-selectors)

### 2. NodePort

**NodePort detects external requests arriving at a particular port on a node IP, `<NodeIP>:<NodePort>`, and forwards them to the connected Pods**. A **ClusterIP** is also created automatically to direct incoming cluster traffic to those Pods.

![Architecture of a NodePort Service](/content/images/2022/02/nodeport.png)

Image source: [Google Cloud](https://medium.com/google-cloud/kubernetes-nodeport-vs-loadbalancer-vs-ingress-when-should-i-use-what-922f010849e0)

Add `nodePort` under `spec.ports` to specify the node port external users can access. Its range is `30000` through `32767`; omitting it assigns a random port in that range.

```yaml
apiVersion: v1
kind: Service
metadata:
  name: myapp-service
spec:
  type: NodePort
  ports:
  - targetPort: 80		# Port exposing the application (Pod)
    port: 80			# Port exposing the Service
    nodePort: 30008		# Port for external access to the application (optional)
  selector:				# Select matching Pods
    app: myapp
    type: frontend
```

**NodePort** load balances across all Pods matching `spec.selector`. If matching Pods span multiple nodes, the same Service is automatically created on those nodes and exposes the Pods through the same node port. For example, if matching Pods exist on `192.168.1.2` and `192.168.1.3`, either `192.168.1.2:<nodePort>` or `192.168.1.3:<nodePort>` can reach them.

### 3. LoadBalancer

For clouds such as AWS, Azure, and GCP that provide external load balancers, Kubernetes offers the **LoadBalancer** type to provision one for a cluster Service.

![Architecture of a LoadBalancer Service](/content/images/2022/02/loadbalancer.png)

Image source: [Google Cloud](https://medium.com/google-cloud/kubernetes-nodeport-vs-loadbalancer-vs-ingress-when-should-i-use-what-922f010849e0)

This **exposes the Service through the provider's load balancer**, automatically creating the necessary **NodePort** and **ClusterIP**. Provisioned load balancer information appears in `status.loadBalancer`.

```yaml
apiVersion: v1
kind: Service
metadata:
  name: myapp-service
spec:
  type: LoadBalancer
  ports:
    - protocol: TCP
      port: 80				# Port exposing the Service
      targetPort: 80		# Port exposing the application (Pod)
  clusterIP: 10.0.171.239	# Cluster IP
  selector:
    app: myapp
    type: frontend
status:
  loadBalancer:				# Provisioned load balancer information
    ingress:
    - ip: 192.0.2.127
```

Traffic arriving through the external load balancer reaches matching Pods according to the Service configuration. How that traffic is balanced depends on the cloud provider's settings.

In environments without this provisioning support, such as VirtualBox, a Service of this type behaves like **NodePort**.

### 4. ExternalName

Use **ExternalName to specify a DNS name directly instead of a selector**. Enter the DNS address in `spec.externalName`; cluster DNS returns a `CNAME` record for it.

```yaml
apiVersion: v1
kind: Service
metadata:
  name: myapp-service
  namespace: prod
spec:
  type: ExternalName
  externalName: my.database.example.com
```

## Apply a Service to a Pod through the CLI

YAML is preferable for defining Services, but CLI commands can quickly expose an existing Pod. You can use `kubectl create service <type> ...`, or use `kubectl expose` to create a Service and expose a particular resource in one operation:

```bash
# Create a new pod called custom-nginx using the nginx image and expose it on container port 8080.
kubectl run custom-nginx --image=nginx --port=8080 && kubectl expose pod custom-nginx
```

Suppose port `6379` of a Pod named `redis` needs to be exposed inside the cluster through `ClusterIP`. You might create a Service directly:

```bash
kubectl create service clusterip redis --tcp=6379:6379
```

This has a problem: the generated `spec.selector` is fixed to `app=redis`, rather than reflecting the target Pod's actual labels, unless you export and edit the YAML. It is better in this case to use `kubectl expose pod`:

```bash
kubectl expose pod redis --port=6379 --name redis-service
```

## Closing

We have examined Kubernetes' four Service types: `ClusterIP`, `NodePort`, `LoadBalancer`, and `ExternalName`.

A Service provides a stable network access point for an application running in one or more Pods. Understanding these types and their purposes is essential when building a multi-application system on a Kubernetes cluster.

## References

- [Kubernetes Documentation: Services](https://kubernetes.io/docs/concepts/services-networking/service/)
- [Google Cloud: Kubernetes NodePort vs LoadBalancer vs Ingress? When should I use what?](https://medium.com/google-cloud/kubernetes-nodeport-vs-loadbalancer-vs-ingress-when-should-i-use-what-922f010849e0)
- [Docker/Kubernetes online bootcamp with Kakao Enterprise](https://classlion.net/class/detail/21) (selected lectures from weeks 11-14)
