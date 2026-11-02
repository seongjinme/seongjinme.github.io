---
title: "How to Build the Tech Blog with Ghost and Docker Compose"
description: "Docker becomes more convenient with Docker Compose. Define multiple containers declaratively, then deploy and manage them together."
pubDate: "2022-01-24T12:27:00.000Z"
updatedDate: "2022-07-26T02:26:49.000Z"
tags: ["docker", "blog", "career", "ghost-tag"]
featureImage: "/content/images/2022/02/cover-6.jpg"
lang: en
---

[The previous article](/en/how-to-build-ghost-blog-with-docker/) introduced a simple way to create a Ghost CMS technical blog on Amazon Lightsail with Docker. Wherever Docker Engine is installed, applications can be deployed in the configuration you want without much difficulty. That frees you from preparing every dependency beforehand.

## The problems with using only Docker CLI commands

Operating containers entirely through commands has some inconveniences:

1. **Container creation history is hard to recover.** Commands entered in a CLI session disappear after that session ends. Unless creation settings were saved separately, an administrator must inspect container information one item at a time.
2. **Managing multiple containers together is difficult.** An application rarely runs on just one container; usually several containers provide its environment. Managing each manually is cumbersome.

Our Ghost blog requires both `nginx-proxy`, acting as a reverse proxy, and `nginx-proxy-acme`, automating SSL certificates. `nginx-proxy-acme` itself depends on `nginx-proxy`. Managing deployment settings that account for these dependencies solely through CLI commands is inefficient. Accidentally starting containers in the wrong order can also prevent the blog from working.

How can we deploy several containers together as intended and manage them easily? **Defining them declaratively in one file, instead of an imperative sequence of commands**, would make management more efficient without repeated commands. **Docker Compose** addresses this need.

## What is Docker Compose?

**Docker Compose is a Docker component for defining and running multiple containers together.** The settings previously supplied one option at a time can be organized clearly in YAML. Compose enables more detailed configuration of networking, shared configuration files, and dependencies between containers.

### Install Docker Compose

Although considered a Docker component, Compose is not included with Docker by default and requires installation.

- Follow the [official installation documentation](https://docs.docker.com/compose/install/). Docker Engine must already be installed.
- [Docker Desktop](https://www.docker.com/products/docker-desktop) includes Compose, so no separate installation is needed.

## Convert Docker commands to Docker Compose

Let us reconfigure the Ghost blog containers deployed on Lightsail in [the previous article](/en/how-to-build-ghost-blog-with-docker/).

### 1. The nginx-proxy container

This was the command used to deploy `nginx-proxy`:

```docker
$ sudo docker run --detach --name nginx-proxy \
    --publish 80:80 \
    --publish 443:443 \
    --volume certs:/etc/nginx/certs \
    --volume vhost:/etc/nginx/vhost.d \
    --volume html:/usr/share/nginx/html \
    --volume /home/ubuntu/blog/conf/client_max_body_size.conf:/etc/nginx/conf.d/client_max_body_size.conf:ro \
    --volume /var/run/docker.sock:/tmp/docker.sock:ro \
    --restart unless-stopped \
    nginxproxy/nginx-proxy
```

Converted into Compose YAML:

```yaml
version: '3.9'

services:
  nginx-proxy:
    image: nginxproxy/nginx-proxy
    container_name: nginx-proxy
    ports:
      - "80:80"
      - "443:443"
    restart: unless-stopped
    volumes:
      - conf:/etc/nginx/conf.d
      - certs:/etc/nginx/certs:ro
      - vhost:/etc/nginx/vhost.d
      - html:/usr/share/nginx/html
      - /home/ubuntu/blog/conf/client_max_body_size.conf:/etc/nginx/conf.d/client_max_body_size.conf:ro
      - /var/run/docker.sock:/tmp/docker.sock:ro
    network_mode: bridge

volumes:
  conf:
  certs:
  vhost:
  html:
  acme:
  ghost-data:
```

`version` identifies the [Compose file format version](https://docs.docker.com/compose/compose-file/). The main versions are 3 and 2, with differences in commands and notation. Their supported Docker Engine versions also differ, so check compatibility first.

`services` contains information about the containers to deploy. The name beneath it, `services.nginx-proxy`, is a Compose service name rather than the actual container name. Its entries include:

- `image`: The container image, corresponding to the final argument of `docker run`, here `nginxproxy/nginx-proxy`.
- `container_name`: The container's name, corresponding to `--name`. If omitted, Compose generates a name in the form `<service-name>-<random-number>`.
- `ports`: Ports to expose, corresponding to `--publish`.
- `restart`: The restart policy, corresponding to `--restart`.
- `volumes`: Volume settings. For Docker volumes, use `<volume-name>:<assigned-host-path>`. [The previous article explains each volume.](/en/how-to-build-ghost-blog-with-docker/#2-set-up-a-reverse-proxy-run-nginx-proxy) In particular, the host path for `client_max_body_size.conf` depends on your environment. Remove it if unnecessary.
- `network_mode`: The container's network mode inside Docker Engine. The default, `bridge`, uses Docker's `docker0` bridge network for communication. [See the network settings documentation.](https://docs.docker.com/engine/reference/run/#network-settings)

Finally, top-level `volumes`, alongside `services`, lists the names of Docker volumes used by the containers. Bind mounts specified only as `host-path:container-path`, without a volume name, are not included there.

This completes a YAML file for deploying `nginx-proxy` through Compose.

### 2. The nginx-proxy-acme and ghost containers

Convert the remaining containers in the same way. First, the original `nginx-proxy-acme` command:

```bash
$ sudo docker run --detach --name nginx-proxy-acme \
    --volumes-from nginx-proxy \
    --volume /var/run/docker.sock:/var/run/docker.sock:ro \
    --volume acme:/etc/acme.sh \
    --restart unless-stopped \
    nginxproxy/acme-companion
```

Its YAML equivalent:

```yaml
version: '3.9'

services:
  nginx-proxy-acme:
    image: nginxproxy/acme-companion
    container_name: nginx-proxy-acme
    depends_on:
      - "nginx-proxy"
    restart: unless-stopped
    volumes:
      - certs:/etc/nginx/certs:rw
      - acme:/etc/acme.sh
      - vhost:/etc/nginx/vhost.d
      - html:/usr/share/nginx/html
      - /var/run/docker.sock:/var/run/docker.sock:ro
    network_mode: bridge

volumes:
  certs:
  acme:
  vhost:
  html:
```

This resembles the previous conversion, with one addition: `depends_on`.

- `depends_on` specifies services that must start first. Since `nginx-proxy-acme` cannot work without `nginx-proxy`, it establishes their startup order. Use the service name, not the container name.
- It checks only whether the named service has started, not whether it is fully running and listening.

Now convert `ghost`:

```bash
$ sudo docker run --detach --name ghost \
    --volume ghost-data:/var/lib/ghost/content \
    --env "VIRTUAL_HOST=seongjin.me,www.seongjin.me" \
    --env "VIRTUAL_PORT=2368" \
    --env "LETSENCRYPT_HOST=seongjin.me" \
    --env "LETSENCRYPT_EMAIL=<administrator-email-address>" \
    --env "url=https://seongjin.me" \
    --restart unless-stopped \
    ghost:latest
```

The result adds dependencies on both `nginx-proxy` and `nginx-proxy-acme`:

```yaml
version: '3.9'

  ghost:
    image: ghost:latest
    container_name: ghost
    depends_on:
      - "nginx-proxy"
      - "nginx-proxy-acme"
    restart: unless-stopped
    environment:
      - VIRTUAL_HOST=seongjin.me,www.seongjin.me
      - VIRTUAL_PORT=2368
      - LETSENCRYPT_HOST=seongjin.me
      - LETSENCRYPT_EMAIL=<administrator-email-address>
      - url=https://seongjin.me
    volumes:
      - ghost-data:/var/lib/ghost/content
    network_mode: bridge

volumes:
  ghost-data:
```

### 3. Combine the three containers into one YAML file

Collect the converted configuration in `docker-compose.yaml`. Place `nginx-proxy`, `nginx-proxy-acme`, and `ghost` under `services`, and list their shared Docker volumes separately under `volumes`.

The final file is:

```yaml
version: '3.9'

services:
  nginx-proxy:
    image: nginxproxy/nginx-proxy
    container_name: nginx-proxy
    ports:
      - "80:80"
      - "443:443"
    restart: unless-stopped
    volumes:
      - conf:/etc/nginx/conf.d
      - certs:/etc/nginx/certs:ro
      - vhost:/etc/nginx/vhost.d
      - html:/usr/share/nginx/html
      - /home/ubuntu/blog/conf/client_max_body_size.conf:/etc/nginx/conf.d/client_max_body_size.conf:ro
      - /var/run/docker.sock:/tmp/docker.sock:ro
    network_mode: bridge

  nginx-proxy-acme:
    image: nginxproxy/acme-companion
    container_name: nginx-proxy-acme
    depends_on:
      - "nginx-proxy"
    restart: unless-stopped
    volumes:
      - certs:/etc/nginx/certs:rw
      - acme:/etc/acme.sh
      - vhost:/etc/nginx/vhost.d
      - html:/usr/share/nginx/html
      - /var/run/docker.sock:/var/run/docker.sock:ro
    network_mode: bridge

  ghost:
    image: ghost:latest
    container_name: ghost
    depends_on:
      - "nginx-proxy"
      - "nginx-proxy-acme"
    restart: unless-stopped
    environment:
      - VIRTUAL_HOST=seongjin.me,www.seongjin.me
      - VIRTUAL_PORT=2368
      - LETSENCRYPT_HOST=seongjin.me
      - LETSENCRYPT_EMAIL=<administrator-email-address>
      - url=https://seongjin.me
    volumes:
      - ghost-data:/var/lib/ghost/content
    network_mode: bridge

volumes:
  conf:
  certs:
  vhost:
  html:
  acme:
  ghost-data:
```

## Deploy the blog with Docker Compose

Everything is ready. All that remains is deploying the entire blog through Compose.

Compose is generally used from the directory containing the deployment YAML. Move to the directory holding `docker-compose.yaml` and run:

```bash
$ sudo docker-compose up --detach
```

After waiting for startup, check deployment with `sudo docker-compose ps`:

```bash
      Name                    Command               State                Ports
-------------------------------------------------------------------------------------------
ghost              docker-entrypoint.sh node  ...   Up      2368/tcp
nginx-proxy        /app/docker-entrypoint.sh  ...   Up      0.0.0.0:443->443/tcp,:::443->44
                                                            3/tcp, 0.0.0.0:80->80/tcp,:::80
                                                            ->80/tcp
nginx-proxy-acme   /bin/bash /app/entrypoint. ...   Up
```

If every service shows `Up`, visit the URL configured for Ghost. **Your new technical blog is running, deployed with a single command.**

[See the documentation for more about docker-compose up.](https://docs.docker.com/compose/reference/up/)

## Update blog components with Docker Compose

One advantage of declaring components in a file is the ease of checking current settings and applying changes.

Suppose `nginx-proxy` needs a particular image version, `nginx-proxy:0.10.0`:

1. Change `services.nginx-proxy.image` in `docker-compose.yaml` to `nginx-proxy:0.10.0`.
2. Pull it with `sudo docker-compose pull`.
3. Run `sudo docker-compose up --detach`. **Done.**

You do not need to bring existing services `down`. `docker-compose up` checks whether they are running and updates and restarts those whose images changed. Mounted volumes and data remain preserved.

To remove services or containers no longer listed in `docker-compose.yaml`, add `--remove-orphans` in step 3. Then run `sudo docker image prune` to remove unused images.

## Closing

We have converted Docker commands to YAML and used Compose to deploy and update the application.

Docker already reduces the work of managing application environments, but Compose makes it more convenient still. When an application needs several interdependent containers managed together, Compose is a very useful tool.
