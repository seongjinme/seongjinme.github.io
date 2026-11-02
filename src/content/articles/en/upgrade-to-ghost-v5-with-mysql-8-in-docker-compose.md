---
title: "Upgrading a Ghost v4 Blog to Ghost v5 with Docker Compose"
description: "How to upgrade a Ghost 4 blog deployed with Docker Compose to Ghost 5."
pubDate: "2022-07-12T09:20:20.000Z"
updatedDate: "2022-08-11T11:52:23.000Z"
tags: ["docker", "ghost-tag"]
featureImage: "/content/images/2022/07/cover.png"
lang: en
---

Before getting to the procedure, I want to discuss how Ghost 5's operating environment differs from earlier versions. These changes matter for users who have self-hosted Ghost 3.x or 4.x.

[(Skip to the upgrade procedure ↓)](#upgrade-procedure)

![Introducing Ghost 5](/content/images/2022/07/ghost-v5.png)

Image source: [Ghost's official website](https://ghost.org/changelog/5/)

## Ghost 5 is MySQL 8 only

Ghost describes itself as a content publishing platform for independent creators. Most previous updates therefore focused on related features and improvements.

This time is different. Ghost 5 brings major changes to blog deployment and operations. If you use Ghost as a self-hosted CMS, check these points:

1. Only **MySQL 8** is supported in production going forward.
2. **MySQL 5** is no longer supported in any environment.
3. **MariaDB** is no longer supported in any environment either.
4. **SQLite3** is no longer supported in production.
5. The official production stack is now **Ubuntu 20, Node 16, and MySQL 8**.

For a platform promoting independent creators, strengthening dependence on a particular DBMS is a disappointing decision. In [the related GitHub issue](https://github.com/TryGhost/Ghost/issues/14446), the CTO explains that **a small team has long supported a limited range of environments to keep maintenance costs manageable**. Given [this firm comment](https://github.com/TryGhost/Ghost/issues/14446#issuecomment-1094464220) about dropping production support for SQLite3, that direction seems likely to continue:

> "To make Ghost super-fast we need to optimize the codebase to be performant on MySQL. If optimizations breaks parts of SQLite, so be it."

### Why is this a problem?

The community-maintained [Ghost image](https://hub.docker.com/_/ghost/) on [Docker Hub](https://hub.docker.com) assumes SQLite3. My blog has also used SQLite3 for convenient container management. I still think it is useful for a small personal website on a single instance.

With SQLite3 unsupported in production and only MySQL 8 receiving official support, however, I can no longer avoid considering migration. I therefore **decided to upgrade to Ghost 5 and migrate the data together for future maintenance**.

One advantage of Docker is that **updating an application can be as simple as refreshing its container image and redeploying**. Proper volume settings also **preserve important data on the host after a container stops**. Let us use these advantages for the upgrade and migration.

## Upgrade procedure

Upgrading Ghost 4 to Ghost 5 in Docker, while moving to MySQL 8, requires these tasks. The examples use the Amazon Lightsail deployment in ["Creating and Managing a Ghost Technical Blog with Docker Compose"](/en/how-to-build-ghost-blog-with-docker-compose/#3-combine-the-three-containers-into-one-yaml-file).

1. Download existing posts and settings as JSON from Ghost administration.
2. Back up other blog data, including images and themes.
3. Reconfigure the Compose file.
4. Stop the existing blog and start the new deployment.
5. Import the JSON backup through the new blog's administration screen.

### 1. Back up posts

In the administration screen at `your-blog-address/ghost`, click `Settings` at the lower left, then `Labs`. You will see `Migration Options`:

![Settings > Labs in Ghost administration](/content/images/2022/07/step1_export.png)

Click `Export` under `Export your content` to download posts, account information, and settings as JSON. This includes code entered through `Settings -> Code injection`.

### 2. Back up existing blog data

If Docker volumes are already configured, the data stays safely on the host when containers stop. A separate backup is still recommended, just in case.

List volumes with `sudo docker volume ls` and back up the one assigned to `ghost`, named `ghost-data`.

Docker volumes live under `/var/lib/docker/volumes`. `sudo docker volume inspect <volume-name>` shows the exact path in `Mountpoint`. Access requires `root`.

![Inspecting volume information](/content/images/2022/07/step2_inspect_volume-1.png)

I used `scp`, the secure copy protocol, to download the backup remotely. Since the root-only path cannot be accessed directly in this way, I first compressed its contents and moved the archive to a remotely accessible location:

```bash
# From a remotely accessible location, archive the volume data at /var/lib/docker/volumes/blog_ghost-data.
$ tar cvfz backup-blog_ghost-data.tar.gz /var/lib/docker/volumes/blog_ghost-data/

# Download the backup remotely with scp.
# Use -i if remote access requires a key file.
$ scp -i <keyfile> <username@instance-address>:~/backup-blog_ghost-data.tar.gz ~/backup/backup-blog_ghost-data.tar.gz
```

![Downloading the backup with scp](/content/images/2022/07/step2_scp.png)

#### When volume names receive a prefix

There is a detail worth examining. [Previously](/en/how-to-build-ghost-blog-with-docker-compose/), I named the volume `ghost-data`, but the actual name is `blog_ghost-data`. This comes from how Compose identifies projects.

Compose deploys multi-container applications, and **each application receives an environment separated by project name**. Set this name with `-p` or `--project-name`. Resources created for it, including volumes, containers, and networks, receive the project name as a prefix.

**Without an explicit project name, Compose uses the directory containing the deployment YAML.** My `docker-compose.yaml` was under `/blog/` in my home directory, so the volume became `blog_ghost-data`. Remember this when managing several Compose applications on one instance.

### 3. Prepare the new Compose file

If your image tags are `:latest`, `docker-compose pull && docker-compose up -d` downloads the latest images and restarts containers. **If data and service compatibility are not concerns, that alone completes the work.**

I am migrating from SQLite3 to MySQL 8, so I need to add a MySQL service and connect it to Ghost on the same network. Here are the changes to [my earlier deployment YAML](/en/how-to-build-ghost-blog-with-docker-compose/).

#### 3-1. Update the Ghost service

```yaml
  ghost:
    image: ghost:5
    container_name: ghost
    depends_on:
      - nginx-proxy
      - nginx-proxy-acme
      - db
    restart: unless-stopped
    ports:
      - 8080:2368
    environment:
      VIRTUAL_HOST: ${GHOST_VIRTUAL_HOST}
      VIRTUAL_PORT: ${GHOST_VIRTUAL_PORT}
      LETSENCRYPT_HOST: ${GHOST_LETSENCRYPT_HOST}
      LETSENCRYPT_EMAIL: ${GHOST_LETSENCRYPT_EMAIL}
      database__client: ${GHOST_DB_CLIENT}
      database__connection__host: ${GHOST_DB_HOST}
      database__connection__port: ${GHOST_DB_PORT}
      database__connection__user: ${MYSQL_USER}
      database__connection__password: ${MYSQL_PASSWORD}
      database__connection__database: ${MYSQL_DATABASE}
      url: ${GHOST_URL}
    volumes:
      - ghost-data:/var/lib/ghost/content
```

- Change `ghost:latest` to `ghost:5`. This is not strictly necessary, but gives safer control over major upgrades.
- Add `db`, the MySQL service, to `depends_on`.
- Add environment variables connecting Ghost to `db`. They share the `database__` prefix; [see their descriptions here](https://ghost.org/docs/config/#database).
- Replace individual values with external variable references, `${VARIABLE}`. Section 3-4 explains the `.env` file.

#### 3-2. Add the database service

```yaml
  db:
    image: mysql:8
    container_name: db
    depends_on:
      - nginx-proxy
      - nginx-proxy-acme
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD}
      MYSQL_USER: ${MYSQL_USER}
      MYSQL_PASSWORD: ${MYSQL_PASSWORD}
      MYSQL_DATABASE: ${MYSQL_DATABASE}
    volumes:
      - db-data:/var/lib/mysql
```

- Configure `depends_on` to start after `nginx-proxy` and `nginx-proxy-acme`.
- Mount `/var/lib/mysql` in a Docker volume named `db-data` to persist the database.

Add four environment variables. Only `MYSQL_ROOT_PASSWORD` is required; the others are optional. [The official image description](https://hub.docker.com/_/mysql) lists all available variables.

- `MYSQL_ROOT_PASSWORD`: Password for MySQL's `root` superuser.
- `MYSQL_USER`, `MYSQL_PASSWORD`: Create a user with superuser privileges for the database specified below.
- `MYSQL_DATABASE`: Name of the database created when the image starts.

#### 3-3. Update the certificate renewal container

```yaml
  nginx-proxy-acme:
    image: nginxproxy/acme-companion
    container_name: nginx-proxy-acme
    depends_on:
      - nginx-proxy
    restart: unless-stopped
    environment:
      NGINX_PROXY_CONTAINER: ${NGINX_PROXY_CONTAINER}
    volumes:
      - certs:/etc/nginx/certs:rw
      - acme:/etc/acme.sh
      - vhost:/etc/nginx/vhost.d
      - html:/usr/share/nginx/html
      - /var/run/docker.sock:/var/run/docker.sock:ro
```

- `nginx-proxy-acme` depends on `nginx-proxy`. Add `NGINX_PROXY_CONTAINER` so it can reliably find that service in Docker's network. Its value is the service name running `nginx-proxy`. The following section explains the `${VARIABLE}` notation.

#### 3-4. Create an environment variable file

As environment variables multiply, finding and changing each value inside YAML becomes cumbersome. Moving them to a separate file makes management easier.

Compose supports several approaches. Here we use the simplest: **a `.env` file in the same directory as the Compose file, with one `VARIABLE=value` per line**. Mine contains:

```yaml
# .env file for compose.yaml
# ENVs for Ghost service
GHOST_VIRTUAL_HOST=seongjin.me,www.seongjin.me
GHOST_VIRTUAL_PORT=2368
GHOST_LETSENCRYPT_HOST=seongjin.me
GHOST_LETSENCRYPT_EMAIL=<administrator-email-address>
GHOST_DB_CLIENT=mysql
GHOST_DB_HOST=db
GHOST_DB_PORT=3306
GHOST_URL=https://seongjin.me

# ENVs for DB service(MySQL)
MYSQL_ROOT_PASSWORD=<password>
MYSQL_USER=ghost
MYSQL_PASSWORD=<password>
MYSQL_DATABASE=ghost

# ENVs for Acme-companion service
NGINX_PROXY_CONTAINER=nginx-proxy
```

When Compose deploys the YAML, values from `.env` are injected into their corresponding `${VARIABLE}` references.

#### 3-5. Other changes

- Remove `network_mode: bridge` from each service because it is unnecessary.
- Without custom networking, Compose connects all application services to an app-wide default network named `<project-name>_default`. `docker-compose up` creates it; `docker-compose down` removes it.
- **MySQL passwords appear as plain-text environment variables in this example.** This is convenient but undesirable for security. Later articles will explain how I replaced this in production.

#### 3-6. Final configuration

Here is the final `compose.yaml`. Existing service volumes are preserved so the blog's data remains intact after redeployment.

[The earlier article explains nginx-proxy's volumes.](/en/how-to-build-ghost-blog-with-docker/#2-set-up-a-reverse-proxy-run-nginx-proxy) In particular, `client_max_body_size.conf` has an environment-specific host path. Remove that entry if the file is unnecessary.

```yaml
version: '3.9'

services:
  nginx-proxy:
    image: nginxproxy/nginx-proxy
    container_name: nginx-proxy
    ports:
      - 80:80
      - 443:443
    restart: unless-stopped
    volumes:
      - conf:/etc/nginx/conf.d
      - certs:/etc/nginx/certs:ro
      - vhost:/etc/nginx/vhost.d
      - html:/usr/share/nginx/html
      # Volume entry changing the upload limit from 1M to 8M; remove if unnecessary.
      # If needed, check the host path and file contents.
      - /home/ubuntu/blog/conf/client_max_body_size.conf:/etc/nginx/conf.d/client_max_body_size.conf:ro
      - /var/run/docker.sock:/tmp/docker.sock:ro

  nginx-proxy-acme:
    image: nginxproxy/acme-companion
    container_name: nginx-proxy-acme
    depends_on:
      - nginx-proxy
    restart: unless-stopped
    environment:
      NGINX_PROXY_CONTAINER: ${NGINX_PROXY_CONTAINER}
    volumes:
      - certs:/etc/nginx/certs:rw
      - acme:/etc/acme.sh
      - vhost:/etc/nginx/vhost.d
      - html:/usr/share/nginx/html
      - /var/run/docker.sock:/var/run/docker.sock:ro

  ghost:
    image: ghost:5
    container_name: ghost
    depends_on:
      - nginx-proxy
      - nginx-proxy-acme
      - db
    restart: unless-stopped
    ports:
      - 8080:2368
    environment:
      VIRTUAL_HOST: ${GHOST_VIRTUAL_HOST}
      VIRTUAL_PORT: ${GHOST_VIRTUAL_PORT}
      LETSENCRYPT_HOST: ${GHOST_LETSENCRYPT_HOST}
      LETSENCRYPT_EMAIL: ${GHOST_LETSENCRYPT_EMAIL}
      database__client: ${GHOST_DB_CLIENT}
      database__connection__host: ${GHOST_DB_HOST}
      database__connection__port: ${GHOST_DB_PORT}
      database__connection__user: ${MYSQL_USER}
      database__connection__password: ${MYSQL_PASSWORD}
      database__connection__database: ${MYSQL_DATABASE}
      url: ${GHOST_URL}
    volumes:
      - ghost-data:/var/lib/ghost/content

  db:
    image: mysql:8
    container_name: db
    depends_on:
      - nginx-proxy
      - nginx-proxy-acme
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD}
      MYSQL_USER: ${MYSQL_USER}
      MYSQL_PASSWORD: ${MYSQL_PASSWORD}
      MYSQL_DATABASE: ${MYSQL_DATABASE}
    volumes:
      - db-data:/var/lib/mysql

volumes:
  conf:
  certs:
  vhost:
  html:
  acme:
  ghost-data:
  db-data:
```

### 4. Redeploy with the new Compose file

Stop the existing blog and deploy again with the revised Compose file and `.env`:

```bash
# Stop the existing blog first.
$ docker-compose down

# Redeploy the blog from the revised Compose file.
$ docker-compose up -d
```

If deployment succeeds, `docker-compose ps` shows:

```bash
      Name                    Command               State                         Ports
--------------------------------------------------------------------------------------------------------------
db                 docker-entrypoint.sh mysqld      Up      3306/tcp, 33060/tcp
ghost              docker-entrypoint.sh node  ...   Up      0.0.0.0:8080->2368/tcp,:::8080->2368/tcp
nginx-proxy        /app/docker-entrypoint.sh  ...   Up      0.0.0.0:443->443/tcp,:::443->443/tcp,
                                                            0.0.0.0:80->80/tcp,:::80->80/tcp
nginx-proxy-acme   /bin/bash /app/entrypoint. ...   Up
```

### 5. Restore the post backup

Visiting the blog now shows a newly initialized Ghost installation. The final task is to **restore the backed-up posts**.

Open `your-blog-address/ghost` and sign up again using your previous administrator ID and password. Go to `Settings`, then `Labs`, as in step 1. In `Migration Options`, click `Import` under `Import content` and upload the backed-up JSON.

![Warnings after importing the backup](/content/images/2022/07/step5_error.png)

Some warnings appear, as shown above, but they only say duplicate user information and theme settings were not imported. If the previous container's `/var/lib/ghost/content` was correctly mounted as a Docker volume, themes and images remain safely stored there.

I went to `Settings` - `Design`, activated the previous theme again, restored its settings, and saved. I then checked that posts, pages, and images had all been restored correctly. That completed the Ghost 5 upgrade and data migration.

## Closing

This upgrade reminded me how **convenient Docker is**. Even adding MySQL required only **Compose configuration and a few environment variables**. Replacing SQLite3 or MariaDB with MySQL on a bare-metal system would have been much more difficult.

One issue remains. **Sensitive information such as passwords should not be left in plain text on the Docker host.** Even if the container environment requires plain text internally, I needed a way to encrypt or otherwise conceal it on the host. The following series will cover what I learned while working through that problem.
