---
title: "Managing Container Configuration with Docker Swarm Configs"
description: "Use the Configs to inject the settings and files needed by container-based Services in Docker Swarm."
pubDate: "2022-09-06T07:54:13.000Z"
tags: ["docker"]
lang: en
---

This blog currently uses an [`nginx-proxy`](https://hub.docker.com/r/nginxproxy/nginx-proxy) container as a [reverse proxy](https://www.cloudflare.com/ko-kr/learning/cdn/glossary/reverse-proxy/). It limits HTTP file uploads to `2MB`.

I often upload large images or themes, so I raised the limit to `8MB`. Initially, as [described here](/en/how-to-build-ghost-blog-with-docker/#2-set-up-a-reverse-proxy-run-nginx-proxy), I created a `.conf` file with `client_max_body_size` set to `8M` and bind-mounted it read-only under `/etc/nginx/conf.d/`:

```yaml
services:
  nginx-proxy:
    image: nginxproxy/nginx-proxy
    ...
    volumes:
      ...
      - /home/ubuntu/blog/conf/client_max_body_size.conf:/etc/nginx/conf.d/client_max_body_size.conf:ro
      ...
```

This is simple and intuitive on a single host. A multi-node cluster complicates things. [The previous article covered bind-mount drawbacks.](/en/docker-swarm-services/#bind-mount) Every available node would need this container-specific `.conf` file at the same host path. Reduced host dependence is a strength of containerization; bind mounts negate it.

With a dedicated image registry, we could build a custom image through a Dockerfile. **Configs**, however, let us apply settings or files to Swarm Services without that extra work.

## What Configs are for

A Config **manages nonsensitive container configuration at the cluster level**. It is useful when an image-based container needs external configuration files or values.

Remember these characteristics:

- Configs work **only with Services created in Swarm mode**, not individual containers created by Docker or Compose.
- **Data is not encrypted** and can be read in plain text from nodes with access.
- Configs are **mounted directly into the Task container's filesystem**.
- They can be added or removed at any time, causing affected Tasks to be terminated, recreated, and rescheduled.
- Multiple Services can share one Config.
- One Service can use multiple Configs.
- A Config connected to a running Service cannot be deleted from the cluster until detached.
- A Task using a Config keeps running if its node disconnects, but configuration cannot be added, changed, or removed until reconnection.
- `docker service inspect` shows a Service's Configs. There is not yet a reverse lookup showing all Services using a particular Config.

## Config basics

### Create a Config

Use `docker config create`:

```bash
docker config create <config-name> <file-path|->
```

The last argument is either a file path or `-`:

1. A path reads the contents of that text file.
2. `-` reads from `STDIN`.

```bash
# 1. Create from the text file at the specified path.
docker config create my-config ~/my-config.conf

# 2. Create from input received on STDIN.
echo "this is my config" | docker config create my-config -
```

Add `key=value` labels with `--label` or `-l`, one flag per label. Labels do not affect the injected data; they help distinguish and manage Configs:

```bash
# Create my-config from file contents,
# and add labels env=DEV and date=20220901.
docker config create \
	--label env=DEV \
	--label date=20220901 \
	my-config ~/my-config.conf
```

### Inspect Configs

List stored Configs with `docker config ls`:

```bash
ubuntu@sjhong-node-01:~$ docker config ls

ID                          NAME        CREATED              UPDATED
pfg1utw1q5w72q9bja4zor542   my-config   About a minute ago   About a minute ago
```

Inspect one with `docker config inspect <name-or-ID>`. Its default JSON output contains the ID, creation date, labels, and original data:

```bash
ubuntu@sjhong-node-01:~$ docker config inspect my-config

[
    {
        "ID": "j1xbrhfjeshm1moxe7zgczrk8",
        "Version": {
            "Index": 2043
        },
        "CreatedAt": "2022-09-05T12:01:34.308994929Z",
        "UpdatedAt": "2022-09-05T12:01:34.308994929Z",
        "Spec": {
            "Name": "my-config",
            "Labels": {
                "date": "20220901",
                "env": "DEV"
            },
            "Data": "dGhpcyBpcyBteSBjb25maWcK"
        }
    }
]
```

The actual data in `.Spec.Data` is simply the original text encoded as `base64`. Decode it with `base64 --decode`:

```bash
ubuntu@sjhong-node-01:~$ echo "dGhpcyBpcyBteSBjb25maWcK" | base64 --decode

# The original Config data is printed.
this is my config
```

Using `--format` to access `.Spec.Data` directly exposes an array of ASCII character codes:

```bash
ubuntu@sjhong-node-01:~$ docker config inspect --format='{{.Spec.Data}}' my-config

# An ASCII character array representing "this is my config\n".
[116 104 105 115 32 105 115 32 109 121 32 99 111 110 102 105 103 10]
```

Alternatively, use `--pretty` to read the original data:

```bash
ubuntu@sjhong-node-01:~$ docker config inspect --pretty my-config

# Prints ID, name, labels, creation/update dates, and original data.
ID:			j1xbrhfjeshm1moxe7zgczrk8
Name:			my-config
Labels:
 - date=20220901
 - env=DEV
Created at:            	2022-09-05 12:01:34.308994929 +0000 utc
Updated at:            	2022-09-05 12:01:34.308994929 +0000 utc
Data:
this is my config
```

### Delete a Config

Use `docker config rm <config-name>`. **Only Configs not connected to a Service can be deleted**; otherwise an error appears. We will see this below.

## Use Configs in a Service

Let us replace the upload-limit bind mount described above with Configs for Nginx. We will use:

1. **`size.conf` Config:** The upload-limit configuration.
2. **`index.html` Config:** A page displaying that limit.
3. **`BODY_SIZE` environment variable:** The limit chosen when creating the Service.

### Create templates

First, create `size.conf.tmpl`:

```bash
server {
    client_max_body_size    {{ env "BODY_SIZE" }};
}
```

- Add `client_max_body_size` to the Nginx `server` module configuration.
- Instead of a fixed `client_max_body_size 8M;`, use `{{ env "BODY_SIZE" }}` to inject the value at Service creation.

Next, create `index.html.tmpl`, the page visitors will see:

```html
<html lang="ko">
  <head>
    <title>This is the {{ .Service.Name }} Service.</title>
  </head>
  <body>
    <p>The current "client_max_body_size" is {{ env "BODY_SIZE" }}.</p>
  </body>
</html>
```

- `{{ .Service.Name }}` receives the Service name.
- `{{ env "BODY_SIZE" }}` receives the environment variable supplied at startup.

### Create Configs from the templates

```bash
docker config create --template-driver golang size.conf size.conf.tmpl

docker config create --template-driver golang index.html index.html.tmpl
```

- `--template-driver` selects the engine that fills placeholders when injecting the Config. Here it is `golang`.

### Apply Configs to a Service

Deploy `nginx` with the Configs and environment variable:

```bash
docker service create \
  --name nginx \
  --env BODY_SIZE="8M" \
  --config source=index.html,target=/usr/share/nginx/html/index.html \
  --config source=size.conf,target=/etc/nginx/conf.d/size.conf,mode=0440 \
  --publish published=3000,target=80 \
  --replicas 3 \
  nginx:latest
```

- `--env` supplies `VARIABLE=value`; here `BODY_SIZE="8M"`.
- `--config` injects a Config. `source` names it, `target` specifies the container path, and optional `mode` sets file permissions.
- [The Service article explains publish and replica options.](/en/docker-swarm-services/#create-a-service)

### Verify the configuration

After deployment, inspect these container paths:

- `size.conf` → `/etc/nginx/conf.d/size.conf`
- `index.html` → `/usr/share/nginx/html/index.html`

**Unlike Kubernetes, Swarm requires you to connect to the host running a container before entering it.** To inspect a Task on `sjhong-node-03`, for example, SSH into that node and run `docker exec` there.

First, locate the three replicas:

```bash
ubuntu@sjhong-node-01:~$ docker service ps nginx

ID             NAME      IMAGE          NODE             DESIRED STATE   CURRENT STATE            ERROR     PORTS
ewsa3mch16ki   nginx.1   nginx:latest   sjhong-node-02   Running         Running 16 minutes ago
4kv9rkd47vfl   nginx.2   nginx:latest   sjhong-node-03   Running         Running 16 minutes ago
tg8ig98bpogu   nginx.3   nginx:latest   sjhong-node-01   Running         Running 16 minutes ago
```

They are evenly distributed, one per node. We are on `sjhong-node-01`, so we can directly enter the container in `nginx.3`.

Check `/etc/nginx/conf.d/`:

```bash
# To execute a command inside a container,
# use docker container exec <flags> <container-ID> <command>.
ubuntu@sjhong-node-01:~$ docker container exec $(docker ps --filter name=nginx -q) ls -al /etc/nginx/conf.d

total 24
drwxr-xr-x 1 root root 4096 Sep  6 00:10 .
drwxr-xr-x 1 root root 4096 Aug 23 03:58 ..
-rw-r--r-- 1 root root 1093 Sep  6 00:10 default.conf
-r--r----- 1 root root   41 Sep  6 00:10 size.conf
```

`size.conf` is present. Inspect its contents to confirm the `8M` supplied through `BODY_SIZE`:

```bash
ubuntu@sjhong-node-01:~$ docker container exec $(docker ps --filter name=nginx -q) cat /etc/nginx/conf.d/size.conf

server {
    client_max_body_size    8M;
}
```

Check the page with `curl`; both the template and its `8M` value appear:

```bash
ubuntu@sjhong-node-01:~$ curl localhost:3000

<html lang="ko">
  <head>
    <title>This is the nginx Service.</title>
  </head>
  <body>
    <p>The current "client_max_body_size" is 8M.</p>
  </body>
</html>
```

Change or remove environment variables at any time with `docker service update --env-add` or `--env-rm`:

```bash
# Change BODY_SIZE from 8M to 10M.
docker service update --env-add BODY_SIZE=10M nginx

# Inspect size.conf in the container to confirm the changed limit.
ubuntu@sjhong-node-01:~$ docker container exec $(docker ps --filter name=nginx -q) cat /etc/nginx/conf.d/size.conf

server {
    client_max_body_size    10M;
}
```

### Replace a Config in use

A Config's data cannot be modified after creation. Create a replacement and use `docker service update` to mount it at the old path.

Create `size-new.conf`:

```bash
server {
    client_max_body_size    {{ env "BODY_SIZE" }};
    location / {
        root   /usr/share/nginx/html;
        index  index.html index.htm index.php;
    }
}
```

Apply it to `nginx`:

```bash
docker service update \
  --config-rm size.conf \
  --config-add source=size-new.conf,target=/etc/nginx/conf.d/size.conf,mode=0440 \
  nginx
```

- `--config-rm` detaches the old Config, specified by its source name.
- `--config-add` mounts the new one, with a source name and target path. Use the previous `size.conf` path.

After the update, inspect `size.conf` again:

```bash
docker container exec $(docker ps --filter name=nginx -q) cat /etc/nginx/conf.d/size.conf

# The replacement size-new.conf Config has been injected.
server {
    client_max_body_size    8M;
    location / {
        root   /usr/share/nginx/html;
        index  index.html index.htm index.php;
    }
}
```

`docker service update` terminates old Tasks and schedules replacements, so container IDs change too. Use `docker ps` to find the new ID. Combining commands with `$(docker ps --filter name=<service-name> -q)` saves manually looking it up each time.

### Detach and delete Configs

Try deleting a Config still attached to `nginx`:

```bash
# Output of docker config rm index.html
ubuntu@sjhong-node-01:~$ docker config rm index.html

Error response from daemon: rpc error: code = InvalidArgument desc = config 'index.html' is in use by the following service: nginx
```

A connected Config cannot be deleted until detached. Use `docker service update --config-rm` first:

```bash
# Detach all Configs from the nginx Service.
ubuntu@sjhong-node-01:~$ docker service update --config-rm size-new.conf --config-rm index.html nginx

# Wait for the Service converged message.
nginx
...
verify: Service converged
```

Check `/etc/nginx/conf.d` again. The injected `size.conf` is gone: detaching a Config removes its corresponding filesystem content.

```bash
ubuntu@sjhong-node-01:~$ docker container exec $(docker ps --filter name=nginx -q) ls -al /etc/nginx/conf.d

total 20
drwxr-xr-x 1 root root 4096 Sep  6 04:42 .
drwxr-xr-x 1 root root 4096 Aug 23 03:58 ..
-rw-r--r-- 1 root root 1093 Sep  6 04:42 default.conf
```

The injected `index.html` is also gone, replaced by the original "Welcome to nginx!" page:

```bash
ubuntu@sjhong-node-01:~$ curl localhost:3000

<!DOCTYPE html>
<html>
<head>
<title>Welcome to nginx!</title>
<style>
html { color-scheme: light dark; }
body { width: 35em; margin: 0 auto;
font-family: Tahoma, Verdana, Arial, sans-serif; }
</style>
</head>
<body>
<h1>Welcome to nginx!</h1>
<p>If you see this page, the nginx web server is successfully installed and
working. Further configuration is required.</p>

<p>For online documentation and support please refer to
<a href="http://nginx.org/">nginx.org</a>.<br/>
Commercial support is available at
<a href="http://nginx.com/">nginx.com</a>.</p>

<p><em>Thank you for using nginx.</em></p>
</body>
</html>
```

## References

- [Docker Docs: Store configuration data using Docker Configs](https://docs.docker.com/engine/swarm/configs/)
- [Docker Docs: docker config](https://docs.docker.com/engine/reference/commandline/config/)
- [Docker Docs: docker service create](https://docs.docker.com/engine/reference/commandline/service_create/)
- [Docker Docs: docker service update](https://docs.docker.com/engine/reference/commandline/service_update/)
