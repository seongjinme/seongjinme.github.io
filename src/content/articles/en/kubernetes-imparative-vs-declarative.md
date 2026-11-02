---
title: "Understanding Imperative and Declarative Approaches in Kubernetes"
description: "What is the difference between kubectl create and apply? Understanding imperative and declarative management explains it, along with the precautions needed in a declarative environment."
pubDate: "2022-03-02T00:55:00.000Z"
updatedDate: "2022-05-26T23:38:47.000Z"
tags: ["kubernetes"]
lang: en
---

Just as imperative and declarative programming are major programming paradigms, Infrastructure as Code (IaC) also has **imperative** and **declarative approaches**.

Kubernetes uses both. Managing objects through CLI commands is **imperative**; managing YAML-based objects through `kubectl apply` is **declarative**. Each has strengths and weaknesses, so choose according to the situation. Many development and production projects require detailed control of clusters and their components, making YAML-based declarative management the more prominent approach.

## The imperative approach

**An imperative approach instructs the actions needed to create a desired state.** In Kubernetes, this includes CLI commands creating, modifying, or deleting components with `kubectl`. It focuses on **how to create the required environment**.

```bash
kubectl run nginx --image=nginx
kubectl create deployment nginx --image=nginx
kubectl expose deployment nginx --port=80
kubectl edit deployment nginx
kubectl scale deployment nginx --replicas=5
kubectl set image deployment nginx nginx=nginx:1.18
kubectl <create|replace|delete> -f nginx.yaml
```

Even if YAML defines a component's state, executing `create` or `replace` remains imperative: you explicitly specify the operation to perform using that file. For example, running `create` with a YAML definition for an already running `nginx` Pod produces a duplicate error. Running `replace` when that Pod does not exist also fails.

This approach has limitations:

1. **Commands alone support only a limited range of tasks.** Configuring complex objects such as multi-container Pods entirely through individual commands is difficult.
2. **Changes are difficult to trace.** In collaborative environments, an object someone created with a quick command may have little accessible history.
3. **You must inspect the current configuration yourself.** The potential errors with `create`, `replace`, and `delete` require manually checking the environment before execution.

Still, **creating and using a needed component immediately with one command is a clear advantage**. Imperative management remains useful when speed and simplicity matter.

## The declarative approach

**A declarative approach states the desired state itself.** In Kubernetes, describe the desired state in YAML and apply it with `kubectl apply -f <filename.yaml>`. Kubernetes decides and performs the work needed to achieve it. The focus is **what the required environment should be**.

Here is the `nginx.yaml` Pod definition introduced earlier:

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

Suppose the Pod is deployed and we want to change its image to a particular version, `nginx:1.20.2`. First modify the YAML:

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
    image: nginx:1.20.2
```

Then apply the changes:

```bash
kubectl apply -f nginx.yaml
```

`kubectl apply` is the declarative part of this process. It checks the file's syntax, determines whether the object already exists, and updates it or creates it accordingly. **The system identifies and applies the state declared by the administrator: this is declarative management in Kubernetes.**

## A precaution: do not mix imperative commands into declarative management!

When configuration files manage Kubernetes components declaratively, never mix `create`, `edit`, or `scale` with `kubectl apply`. Doing so can produce unexpected results during later updates and make change history difficult to trace. Why?

We first need to understand **live object configuration** and **how kubectl apply works**.

### What is live object configuration?

This is information about objects running in the cluster, stored in cluster storage, usually `etcd`. Inspect it with `kubectl get <object-type> <object-name> -o yaml`.

For objects created from YAML configuration, **live object configuration** includes something else: the original file converted to JSON and stored in the annotations as `kubectl.kubernetes.io/last-applied-configuration`. It reflects the **object configuration file** as it stood at the latest `kubectl apply`. This is the **last-applied configuration**.

Declarative updates therefore use three things:

1. The original YAML **object configuration file**
2. The **last-applied configuration**, a JSON representation of that file's previously applied contents
3. The **live object configuration**, which includes the last-applied configuration as an annotation

### How kubectl apply works

`kubectl apply` updates the **last-applied configuration (2)** from the **object configuration file (1)**. How it updates the **live object configuration (3)** differs by situation.

#### Case 1: Adding or changing fields

1. Kubernetes compares the **live object configuration (3)** with the **object configuration file (1)**.
2. Differences are treated as additions or changes and updated according to **the file (1)**.
3. The **last-applied configuration (2)** is updated from **the file (1)**.

#### Case 2: Removing fields

1. Kubernetes finds fields present in **last-applied configuration (2)** but absent from **the file (1)**.
2. These fields are marked for removal from **live object configuration (3)**.
3. The **last-applied configuration (2)** is updated from **the file (1)**.

Why distinguish **last-applied (2)** from **live (3)**? Imperative commands such as `create`, `edit`, and `scale` change **live configuration (3)** without updating **last-applied configuration (2)**. Mixing approaches can leave **fields absent from both the original file and last-applied configuration actively present in the live object**.

### An example of kubectl apply

Let us follow an [example from the official documentation](https://kubernetes.io/docs/tasks/manage-kubernetes-objects/declarative-config/#how-to-create-objects). This is the **original configuration file (1)** for `nginx-deployment`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-deployment
spec:
  selector:
    matchLabels:
      app: nginx
  minReadySeconds: 5
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

After deployment, Kubernetes creates this **live configuration (3)**. The **last-applied configuration (2)** appears as JSON under `metadata.annotations`:

```yaml
apiVersion: v1
kind: Deployment
metadata:
  annotations:
    kubectl.kubernetes.io/last-applied-configuration: |
      {"apiVersion":"apps/v1","kind":"Deployment",
      "metadata":{"annotations":{},"name":"nginx-deployment","namespace":"default"},
      "spec":{"minReadySeconds":5,"selector":{"matchLabels":{"app":nginx}},"template":{"metadata":{"labels":{"app":"nginx"}},
      "spec":{"containers":[{"image":"nginx:1.14.2","name":"nginx",
      "ports":[{"containerPort":80}]}]}}}}
    ...
spec:
  minReadySeconds: 5
  selector:
    matchLabels:
      ...
      app: nginx
  template:
    metadata:
      ...
      labels:
        app: nginx
    spec:
      containers:
      - image: nginx:1.14.2
        ...
        name: nginx
        ports:
        - containerPort: 80
        ...
...
```

Suppose we now:

1. Add replica configuration directly with `kubectl scale deployment/nginx-deployment --replicas=2`.
2. Edit **the original file (1)** to change the image under `spec.containers` to `nginx:1.20.2`, remove `spec.minReadySeconds`, and leave out the `replicas` entry added by the command. Then run `kubectl apply`.

The resulting **live configuration (3)** is:

```yaml
apiVersion: v1
kind: Deployment
metadata:
  annotations:
    # Changes 2-1 and 2-2 also appear in the JSON below.
    # The replicas setting added by kubectl scale is absent.
    kubectl.kubernetes.io/last-applied-configuration: |
      {"apiVersion":"apps/v1","kind":"Deployment",
      "metadata":{"annotations":{},"name":"nginx-deployment","namespace":"default"},
      "spec":{"selector":{"matchLabels":{"app":nginx}},"template":{"metadata":{"labels":{"app":"nginx"}},
      "spec":{"containers":[{"image":"nginx:1.20.2","name":"nginx",
      "ports":[{"containerPort":80}]}]}}}}
    ...
spec:
  replicas: 2     # Added by kubectl scale (1)
  # minReadySeconds removed (2-2)
  selector:
    matchLabels:
      ...
      app: nginx
  template:
    metadata:
      ...
      labels:
        app: nginx
    spec:
      containers:
      - image: nginx:1.20.2     # nginx image version changed (2-1)
        ...
        name: nginx
        ports:
        - containerPort: 80
        ...
...
```

- The `nginx:1.20.2` change and removal of `minReadySeconds` are correctly reflected in both the **live configuration (3)** and `last-applied-configuration`.
- The replica setting added through `kubectl scale` appears only in the live `spec`, not in `last-applied-configuration`, because it was never recorded in **the original file (1)**. An administrator must find this live-only setting and manually incorporate it into the YAML.
- `kubectl edit` poses the same difficulty. Changes to an object originally created from YAML affect only the live Kubernetes object, leaving the file unchanged. This can undermine later version management through deployment files.

## Closing

Remember these precautions in a declarative Kubernetes environment:

1. Use `apply`, rather than `create` or `replace`, to manage YAML-based objects.
2. Never mix `create`, `edit`, or `scale` with `apply`.

Kubernetes is designed around **declaring a desired state**. Detailed management of clusters and components requires familiarity with the **declarative approach**, along with its precautions, so that component change histories remain traceable.

## References

- [Kubernetes Documentation: Declarative Management of Kubernetes Objects Using Configuration Files](https://kubernetes.io/docs/tasks/manage-kubernetes-objects/declarative-config/)
- [Imperative vs. Declarative Kubernetes Management: A DigitalOcean Comic](https://www.digitalocean.com/community/tutorials/imperative-vs-declarative-kubernetes-management-a-digitalocean-comic)
- [Declarative vs. Imperative in IaC | Linode](https://www.linode.com/blog/devops/declarative-vs-imperative-in-iac/)
- [Mumshad Mannambeth's CKA preparation course](https://www.udemy.com/course/certified-kubernetes-administrator-with-practice-tests/) (selected material from section 2: Core Concepts)
