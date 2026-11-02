---
title: "How to Build the Tech Blog on Amazon Lightsail with Ghost and Docker"
description: "Docker lets you set up and manage Ghost CMS with just three commands. This article walks through creating a technical blog on Amazon Lightsail, including SSL certificates."
pubDate: "2022-01-13T05:24:00.000Z"
updatedDate: "2022-02-08T06:57:45.000Z"
tags: ["docker"]
featureImage: "/content/images/2022/02/cover-4.jpg"
lang: en
---

A self-hosted [Ghost](https://ghost.org/) installation requires Node v14, MySQL 5.7 or 8.0, and Nginx as its basic stack. Docker, however, makes it easy to set up a Ghost CMS without depending on the server environment. It **reduces the burden of managing individual dependencies and lets you deploy or update components with a single command**.

This article explains how to deploy the containers needed for Ghost CMS on [Amazon Lightsail](https://aws.amazon.com/lightsail/) and use them to create a technical blog.

## Prerequisites

You need an instance capable of running Docker and a domain to connect to it. Here, we assume an [Amazon Lightsail Ubuntu 18.04 LTS instance](https://lightsail.aws.amazon.com/ls/docs/ko_kr/articles/getting-started-with-amazon-lightsail). One vCPU and at least 1 GB of RAM are recommended. On Lightsail, the $5 monthly plan is suitable. Other cloud instances, such as DigitalOcean, are also fine as long as their OS supports Docker.

![Lightsail makes creating an instance inexpensive and straightforward.](/content/images/2022/01/Lightsail_price.png)

Complete the following before proceeding:

- [Attach a static IP address to the instance.](https://lightsail.aws.amazon.com/ls/docs/ko_kr/articles/lightsail-create-static-ip)
- [Add a DNS zone and records](https://lightsail.aws.amazon.com/ls/docs/ko_kr/articles/lightsail-how-to-create-dns-entry) to connect the domain to that IP.
- [Allow external access](https://lightsail.aws.amazon.com/ls/docs/ko_kr/articles/understanding-firewall-and-port-mappings-in-amazon-lightsail) to ports `80` and `443`. Without access to port `80`, Let's Encrypt cannot issue the SSL certificate correctly.

## Setting up Ghost CMS with Docker

The following procedure draws on the [Docker documentation](https://docs.docker.com/), the [nginxproxy/acme-companion documentation on Docker Hub](https://hub.docker.com/r/nginxproxy/acme-companion), and the [official Ghost Docker image documentation](https://hub.docker.com/_/ghost/).

### 1. Install Docker

Install Docker Engine on your instance first. If you want to manage multiple containers together in a YAML file, install Docker Compose as well. Follow the official installation instructions:

- [Install Docker Engine on Ubuntu](https://docs.docker.com/engine/install/ubuntu/)
- [Install Docker Compose, optional](https://docs.docker.com/compose/install/)

### 2. Set up a reverse proxy: run nginx-proxy

Running a web service smoothly in Docker requires an application acting as a [reverse proxy](https://www.cloudflare.com/learning/cdn/glossary/reverse-proxy/). Jason Wilder's ["Automated Nginx Reverse Proxy for Docker"](http://jasonwilder.com/blog/2014/03/25/automated-nginx-reverse-proxy-for-docker/) concisely explains why.

We will use [nginx-proxy](https://hub.docker.com/r/nginxproxy/nginx-proxy), a container with Nginx configured for automated reverse proxying. When someone visits `seongjin.me`, it forwards traffic to the Ghost container and redirects HTTP connections on port `80` to HTTPS on port `443`.

On the instance where Docker Engine is installed, enter:

```bash
$ sudo docker run --detach --name nginx-proxy \
    --publish 80:80 \
    --publish 443:443 \
    --volume certs:/etc/nginx/certs \
    --volume vhost:/etc/nginx/vhost.d \
    --volume html:/usr/share/nginx/html \
    --volume <path>/client_max_body_size.conf:/etc/nginx/conf.d/client_max_body_size.conf:ro \
    --volume /var/run/docker.sock:/tmp/docker.sock:ro \
    --restart unless-stopped \
    nginxproxy/nginx-proxy
```

`docker run` creates and starts a container. Its options are:

- `--detach` runs it in the background.
- `--name` assigns a unique name. Otherwise Docker generates a random combination of words.
- `--publish` sets port forwarding between host and container. Here we forward `80` for HTTP and `443` for HTTPS.
- `--volume` shares a host location with a container location. Data is normally written inside the container and lost when the container is deleted. To preserve important configuration or system files, assign storage from the host.
- `--restart` sets whether the container restarts after exiting. All containers must remain running for the blog to work, so `unless-stopped` keeps them running unless explicitly stopped for troubleshooting. See [Docker Docs: Restart policies](https://docs.docker.com/engine/reference/run/#restart-policies---restart).
- The final argument selects the image: `nginxproxy/nginx-proxy`.

**This example needs three volume mounts**, all for issuing and applying Let's Encrypt SSL certificates.

- `certs:/etc/nginx/certs` stores certificates and authentication keys.
- `vhosts:/etc/nginx/vhost.d` stores virtual host configuration, allowing the certificate authority (CA) to access challenge files for certificate requests.
- `html:/usr/share/nginx/html` provides storage for those challenge files.

**Two other connections between the host and nginx-proxy are relevant.**

- `--volume /var/run/docker.sock` connects the host's Docker communication socket to the container. It is required for `nginx-proxy`.
- `--volume <path>/client_max_body_size.conf>` is optional but recommended. Nginx limits uploads to 1 MB by default. You could enter the container and edit `nginx.conf`, but creating `client_max_body_size.conf` on the host and mounting it at the container's `etc/nginx/conf.d/` preserves the setting after container restarts. Replace `<path>` with the path to your configuration file. [Detailed instructions are available here.](https://github.com/nginx-proxy/nginx-proxy/issues/981#issuecomment-355765223)

If startup succeeds, `sudo docker ps` shows:

```bash
CONTAINER ID   IMAGE                    COMMAND                  CREATED          STATUS          PORTS                                                                      NAMES
f3f3231bcc13   nginxproxy/nginx-proxy   "/app/docker-entrypo…"   21 seconds ago   Up 20 seconds   0.0.0.0:80->80/tcp, :::80->80/tcp, 0.0.0.0:443->443/tcp, :::443->443/tcp   nginx-proxy
```

### 3. Automate SSL certificates: run acme-companion

[acme-companion](https://hub.docker.com/r/nginxproxy/acme-companion) is a companion container adding SSL certificates and automatic renewal to [nginx-proxy](https://hub.docker.com/r/nginxproxy/nginx-proxy). With `nginx-proxy` running, create and start a container named `nginx-proxy-acme`:

```bash
$ sudo docker run --detach --name nginx-proxy-acme \
    --volumes-from nginx-proxy \
    --volume /var/run/docker.sock:/var/run/docker.sock:ro \
    --volume acme:/etc/acme.sh \
    --env "DEFAULT_EMAIL=<mail@address.com>" \
    --restart unless-stopped \
    nginxproxy/acme-companion
```

- `volumes-from nginx-proxy` reuses the volumes created for `nginx-proxy`.
- `--volume /var/run/docker.sock` is included just as it was for `nginx-proxy`.
- `acme:/etc/acme.sh` stores the `acme.sh` configuration for issuing and renewing Let's Encrypt certificates.
- `DEFAULT_EMAIL` under `--env` is the address for certificate expiry notices. It can be omitted.
- Set `--restart` to `unless-stopped`, as with `nginx-proxy`.
- Finally, select the `nginxproxy/acme-companion` image.

If everything has worked so far, `sudo docker ps` shows:

```bash
CONTAINER ID   IMAGE                       COMMAND                  CREATED              STATUS          PORTS                                                                      NAMES
60de7a53c197   nginxproxy/acme-companion   "/bin/bash /app/entr…"   About a minute ago   Up 59 seconds                                                                              nginx-proxy-acme
f3f3231bcc13   nginxproxy/nginx-proxy      "/app/docker-entrypo…"   26 minutes ago       Up 2 minutes   0.0.0.0:80->80/tcp, :::80->80/tcp, 0.0.0.0:443->443/tcp, :::443->443/tcp   nginx-proxy
```

### 4. Run the Ghost container

[Docker Hub](https://hub.docker.com) provides an [official image for deploying Ghost containers](https://hub.docker.com/_/ghost/). It is not provided directly by Ghost's developers, but maintained through the Ghost development community as a package containing the minimum stack needed to run the CMS.

[Self-hosted Ghost recommends MySQL as its main database.](https://ghost.org/docs/install/ubuntu/#install-mysql) The Docker image, however, includes SQLite instead. To run Ghost with MySQL in Docker, it is best to configure them as multiple containers and deploy with [`docker-compose`](https://docs.docker.com/compose/reference/). For a small blog on one instance that does not need frequent updates, I find SQLite appealing: it uses fewer computing resources and is easy to operate and maintain.

Here, as when I created this blog, we will run only a Ghost container, without MySQL.

```bash
$ sudo docker run --detach --name ghost \
    --volume ghost-data:/var/lib/ghost/content \
    --env "VIRTUAL_HOST=<blog.address, www.blog.address>" \
    --env "VIRTUAL_PORT=2368" \
    --env "LETSENCRYPT_HOST=<blog.address>" \
    --env "LETSENCRYPT_EMAIL=<mail@address.com>" \
    --env "url=<https://blog.address>" \
    --restart unless-stopped \
    ghost
```

- Store the SQLite database files in a Docker volume named `ghost-data`. This prevents data loss if the Ghost container fails or is updated later.
- Set `VIRTUAL_HOST` to the domain connected to the host instance. Include both the `www` and non-`www` domains so redirects follow the DNS CNAME record correctly.
- `VIRTUAL_PORT` determines which internal Docker port receives incoming traffic on `80` and `443`. The Ghost container's internal port is `2368`.
- `LETSENCRYPT_HOST` and `LETSENCRYPT_EMAIL` contain the certificate information: the same domain used for `VIRTUAL_HOST` and your certificate email address.
- Set `url` to the blog's actual URL, including the `https://` prefix.
- Add `--restart unless-stopped` so Ghost stays running except when stopped for troubleshooting.
- Finally, select the `ghost` image.

At this point, `sudo docker ps` should show three running containers:

```bash
CONTAINER ID   IMAGE                       COMMAND                  CREATED          STATUS          PORTS                                                                      NAMES
7a67c0dc94e7   ghost                       "docker-entrypoint.s…"   20 minutes ago   Up 20 minutes   2368/tcp                                                                   ghost
f610030e417f   nginxproxy/acme-companion   "/bin/bash /app/entr…"   21 minutes ago   Up 21 minutes                                                                              nginx-proxy-acme
695b0267de67   nginxproxy/nginx-proxy      "/app/docker-entrypo…"   21 minutes ago   Up 21 minutes   0.0.0.0:80->80/tcp, :::80->80/tcp, 0.0.0.0:443->443/tcp, :::443->443/tcp   nginx-proxy
```

Visit the blog. It should be up with an SSL certificate applied. Even if an individual container fails, the blog data and SSL information remain in Docker volumes, allowing you to troubleshoot without losing them.

## What Docker makes easier

Application development and deployment generally pass through development, testing, staging, and production. Guaranteeing an identical server environment at every stage is difficult, so code verified in development often encounters unexpected production problems. Preparing each environment and resolving application dependencies also takes effort.

Docker dramatically reduces that effort. An application image contains everything needed to run the application. **Wherever Docker Engine is installed, the application can have the same runtime environment.**

- Find an image for the application you need and run it immediately as a container.
- Update an application by refreshing its image and redeploying the container.
- Create and share [your own image with your own application environment](https://docs.docker.com/engine/reference/builder/).
- Use volumes to manage information that must remain on the host after a container stops.
- Except in special cases, each of these tasks takes only a few commands.
- With [Docker Compose](https://docs.docker.com/compose/), deploy and manage multiple containers systematically through YAML.

**This blog was built with just three Docker commands.** Creating a technical blog with Docker is by no means difficult.
