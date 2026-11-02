---
title: "Managing Environment Variables for Service Containers in Docker Compose"
description: "How to manage environment variables in Docker Compose, which values take precedence during deployment, and what to watch out for."
pubDate: "2022-07-20T10:32:23.000Z"
updatedDate: "2022-08-11T11:53:21.000Z"
tags: ["docker"]
featureImage: "/content/images/2022/07/cover-1.png"
lang: en
---

## Ways to supply and manage environment variables

There are four broad ways to handle environment variables in Docker Compose. We will use Docker Hub's [official MySQL image](https://hub.docker.com/_/mysql) as an example.

1. Enter values directly in the Compose file.
2. Set shell environment variables.
3. Use environment variable files.
4. Embed environment variables in a Dockerfile.

### 1. Enter values directly in the Compose file

The most straightforward way to inject environment variables is to write them in the Compose file. Starting a MySQL container requires `MYSQL_ROOT_PASSWORD`, which sets the password for the administrator account, `root`. Add it under `services.<service-name>.environment` as `VARIABLE: value` or `- VARIABLE=value`.

This example sets `MYSQL_ROOT_PASSWORD` to `password` for a MySQL 8 image:

```yaml
version: '3.9'
services:
  mysql:
    image: mysql:8
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: password
```

### 2. Set shell environment variables

You can also declare a variable in the shell and have the Compose file use it. Suppose we enter this command:

```bash
$ export MYSQL_ROOT_PASSWORD=password
```

Write the Compose file as follows. Notice that the value of `MYSQL_ROOT_PASSWORD` under `services.mysql.environment` has become `${MYSQL_ROOT_PASSWORD}`. **When injecting an environment variable from outside the YAML file, mark its destination as `${VARIABLE}` or `$VARIABLE`.** Here I use braces to make the external reference clearer.

```yaml
version: '3.9'
services:
  mysql:
    image: mysql:8
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD}
```

Running `convert` on the deployment file shows the value set in the shell inserted for the corresponding variable:

```bash
$ docker compose convert
# ...
# environment:
#   MYSQL_ROOT_PASSWORD: password
```

### 3. Use environment variable files

Writing every variable in the Compose file or declaring each one in the shell every time is somewhat inefficient. **Collecting the required variables in separate files** makes management easier. We will consider three practical scenarios:

1. Use a single `.env` file.
2. Split variables across multiple files.
3. Use different files for each service.

#### 3-1. Use a single .env file

The simplest approach is to **create a `.env` file in the same directory as the Compose file**. This plain-text file follows these rules:

- Enter one `VARIABLE=value` pair per line.
- Use `#` for comments.
- Blank lines are ignored.
- Quotation marks (`''`, `""`) are unnecessary. Entered quotation marks are treated as part of the variable name or value, depending on their position.

A `.env` file prepared this way is applied to the Compose file without additional configuration. Consider:

```yaml
version: '3.9'
services:
  mysql:
    image: mysql:8
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD}
```

Put the value for `${MYSQL_ROOT_PASSWORD}` in `.env`:

```bash
MYSQL_ROOT_PASSWORD=password
```

Running `convert` now produces:

```bash
$ docker compose convert
# ...
# environment:
#   MYSQL_ROOT_PASSWORD: password
```

This is convenient, but remember that it is **available only when running `docker compose up` with Docker Compose**. A `.env` file cannot be used when running `docker stack deploy` in Docker Swarm.

#### 3-2. Split variables across multiple files

Sometimes you need multiple environment files, such as when development (`dev`) and production (`prod`) require different values. **Create a separate environment file for each environment and choose it at deployment with `--env-file <path>`.**

For example, suppose we create `.env.dev` and `.env.prod`:

```bash
$ cat ./config/.env.dev
MYSQL_ROOT_PASSWORD=passwd_dev

$ cat ./config/.env.prod
MYSQL_ROOT_PASSWORD=passwd_prod
```

Using Docker Compose's `--env-file ./config/.env.dev` flag injects the variables from that file:

```bash
$ docker compose --env-file ./config/.env.dev config
# ...
# environment:
#   MYSQL_ROOT_PASSWORD: passwd_dev
```

#### 3-3. Use different files for each service

Sometimes each service or container needs its own environment file. **Include an `env_file` entry within each service in the Compose file.** If none is specified, you can generally think of `env_file: .env` as the default.

```yaml
version: '3.9'
services:
  mysql:
    env_file: # Use a list when supplying multiple files.
      - a.env
      - b.env
    image: mysql:8
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD}
```

There is something to watch out for here. If several files contain different values for the same variable, which value wins? **The value from the file listed later takes precedence.**

In the YAML above, if `a.env` has `VAR=alpha` and `b.env` has `VAR=beta`, the deployed service receives `VAR=beta`, from the later file, `b.env`. When applying several environment files to a service, check for duplicate variables and pay attention to file order.

### 4. Embed environment variables in a Dockerfile

If you would rather not keep variables in YAML or a separate external file, you can **insert them in a Dockerfile using `ARG` or `ENV`, then build your own image**. The earlier `MYSQL_ROOT_PASSWORD: password` can be expressed as:

```dockerfile
FROM mysql:8
ENV MYSQL_ROOT_PASSWORD password
```

Using a custom MySQL image built from this Dockerfile removes the need to specify that variable separately in deployment YAML or `.env`.

## Environment variable precedence

Finally, let us look at which values take precedence depending on how they are supplied. According to the [Docker documentation](https://docs.docker.com/compose/environment-variables/#set-environment-variables-with-docker-compose-run), the order is:

1. Values written directly in the Compose file
2. Shell environment variables
3. Values supplied in environment files such as `.env`
4. Values embedded through a Dockerfile

To make this more concrete, let us see how Docker Compose selects a value when these methods overlap.

### A precedence example

Suppose we build an image named `seongjin_mysql` with this Dockerfile:

```dockerfile
FROM mysql:8
ENV MYSQL_ROOT_PASSWORD passwd_from_dockerfile
```

Then set a variable in the shell:

```bash
$ export MYSQL_ROOT_PASSWORD=passwd_from_shell
```

Next, create `.env` with this value:

```bash
MYSQL_ROOT_PASSWORD=passwd_from_envfile
```

Finally, write the deployment YAML:

```yaml
version: '3.9'
services:
  mysql:
    image: seongjin_mysql
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: passwd_from_yaml
```

When `docker compose up` runs, the final `MYSQL_ROOT_PASSWORD` applied to the service container depends on the situation:

- With everything as shown, the final value is `passwd_from_yaml`, entered directly in YAML.
- If the YAML entry becomes `MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD}`, the final value is `passwd_from_shell`, entered in the shell.
- If the YAML entry uses that reference but the shell assignment is omitted, the final value is `passwd_from_envfile`, from `.env`.
- If the YAML entry is removed entirely, the shell assignment is omitted, and no `.env` file is created, the final value is `passwd_from_dockerfile`, embedded in the Dockerfile.

## Limitations when handling sensitive information

All these methods share one drawback: **everything is stored in plain text**. Our example used the MySQL image's `root` password, but **leaving important secrets on a host in plain text is certainly undesirable for security**.

Unfortunately, Docker alone seems to offer no satisfactory way to protect secrets used in environment variables. Production environments will, of course, have various ways to compensate.

- One option is a **private registry** that is not exposed externally, with dedicated images containing the secrets. Those secrets remain in particular image layers, however, so both images and registry require careful management.
- Container orchestration tools such as **Kubernetes and Docker Swarm** provide **Secrets** for handling this information more securely. Container instances offered by AWS, Azure, and other major cloud providers also make it convenient to use secrets when setting environment variables.
- For stronger protection, consider a solution such as [HashiCorp Vault](https://www.vaultproject.io/).

## Closing

Docker Compose provides several ways to manage environment variables. Understanding how each works, its characteristics, and its precedence when variables reach the application should help in operating container-based services.

When handling secrets as environment variables in Docker, however, remember that they remain on the system in plain text. I encountered this problem while migrating my blog data from SQLite3 to MySQL and spent a great deal of time thinking it through. In the following series, I will introduce **Docker Swarm** and **Secrets**, which I experimented with as a result, and explain how I applied them to my blog.

## References

- [Docker Docs: Compose file version 3 reference](https://docs.docker.com/compose/compose-file/compose-file-v3)
- [Docker Docs: Environment variables in Compose](https://docs.docker.com/compose/environment-variables/)
- [Docker Docs: Declare default environment variables in file](https://docs.docker.com/compose/env-file/)
