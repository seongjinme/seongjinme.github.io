---
title: "Handling the Sensitive Data with Docker Swarm Secrets"
description: "Use Secrets for passwords, certificates, key files, and other text or binary data that should not be transmitted or stored unencrypted."
pubDate: "2022-09-07T13:04:12.000Z"
tags: ["docker"]
lang: en
---

As of September 2022, this blog runs Ghost 5 with MySQL 8. [The upgrade article explains why I had to adopt MySQL.](/en/upgrade-to-ghost-v5-with-mysql-8-in-docker-compose/) The upgrade demonstrated Docker's convenience but raised a concern: **all information supplied as environment variables remains in plain text on the host**. That may be acceptable for nonsensitive values, but not for a DBMS root password.

Swarm provides a tool for managing sensitive information more securely across a cluster: **Secrets**.

## What Secrets are for

Secrets **securely manage sensitive data at the cluster level**, including passwords, certificates, key files, and other text or binary files that should not be transmitted or stored unencrypted.

Keep these properties in mind:

- They work **only with Services created in Swarm mode**, not individual Docker or Compose containers.
- Their data is **stored encrypted in the cluster**.
- Only **Services assigned a Secret and their running Task containers** can access it.
- A Service's Secrets are decrypted into its containers' **in-memory filesystem**, similar to volatile `tmpfs` storage.
- Containers access them at `/run/secrets/<secret-name>`.
- They can be added or removed at any time, immediately terminating, recreating, and rescheduling affected Tasks.
- When a Task stops, the decrypted data is unmounted and removed from node memory.
- Several Services can share one Secret.
- One Service can use several Secrets.
- Secrets connected to running Services cannot be arbitrarily deleted.
- Tasks using Secrets keep running if their node disconnects, but Secrets cannot be added, changed, or removed until reconnection.
- `docker service inspect` shows a Service's attached configuration objects, but there is not yet a reverse lookup showing all Services attached to a particular object.

### Differences from Kubernetes Secrets

Kubernetes has an object with the same name and purpose, managing passwords, SSH certificates, and key files. Encryption differs:

- **Swarm Secrets are always encrypted**, both in transit and at rest. Plain text exists only inside the mounted container.
- **Kubernetes Secrets remain base64-encoded plain text**. Access to `etcd` makes their contents readily accessible; in that sense, they are a base64 version of ConfigMaps.

Convenience differs too:

- **Swarm Secrets mount only as files**. Images without file-based environment variable support need a separate entrypoint shell script. Individual `key=value` entries inside a Secret cannot be selected separately.
- **Kubernetes Secrets** can also inject `key=value` data into Pod environment variables. A specification can select individual keys from a Secret containing several entries.

## Secret basics

Most usage resembles [Configs from the previous article](/en/docker-swarm-config/). If you know Configs, Secrets should feel familiar.

### Create a Secret

Use `docker secret create`. As with Configs, the final argument determines one of two input methods:

```bash
# 1. Create from the text file at the specified path.
docker secret create my-secret ~/my-secret.json

# 2. Create from input received on STDIN.
echo "this is my secret" | docker secret create my-secret -
```

Add `key=value` labels using `--label` or `-l`. They help distinguish and manage Secrets within the cluster:

```bash
# Create my-secret from the file contents,
# and add the labels env=PROD and date=20220901.
docker secret create \
	--label env=PROD \
	--label date=20220901 \
	my-secret ~/my-secret.json
```

### Inspect Secrets

List them with `docker secret ls`:

```bash
ubuntu@sjhong-node-01:~$ docker secret ls

ID                          NAME        DRIVER    CREATED         UPDATED
sjhong-node-01-25char-ids   my-secret             3 minutes ago   3 minutes ago
```

`docker secret inspect` returns JSON metadata, or more readable output with `--pretty`. Unlike Configs, inspection does not reveal Secret contents. The original data is visible only inside a container where it is mounted:

```bash
ubuntu@sjhong-node-01:~$ docker secret inspect my-secret

[
    {
        "ID": "sjhong-node-01-25char-ids",
        "Version": {
            "Index": 899
        },
        "CreatedAt": "2022-09-07T11:46:24.211879525Z",
        "UpdatedAt": "2022-09-07T11:46:24.211879525Z",
        "Spec": {
            "Name": "my-secret",
            "Labels": {
                "date": "20220901",
                "env": "PROD"
            }
        }
    }
]
```

### Delete a Secret

Use `docker secret rm <secret-name>`. Only unused Secrets, unmounted from Services, can be deleted immediately:

```bash
ubuntu@sjhong-node-01:~$ docker secret rm my-secret

# Successful deletion prints the Secret name.
my-secret
```

## Use Secrets in a Service

[The Ghost 5 upgrade added a MySQL 8 database Service](/en/upgrade-to-ghost-v5-with-mysql-8-in-docker-compose/#3-2-add-the-database-service) with these environment variables:

```yaml
  db:
    image: mysql:8
    container_name: db
    ...
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD}
      MYSQL_USER: ${MYSQL_USER}
      MYSQL_PASSWORD: ${MYSQL_PASSWORD}
      MYSQL_DATABASE: ${MYSQL_DATABASE}
    ...
```

The username, `MYSQL_USER`, and database name, `MYSQL_DATABASE`, can remain plain text. The root password, `MYSQL_ROOT_PASSWORD`, and user password, `MYSQL_PASSWORD`, need protection. Let us replace their plain-text values with Secrets.

### Create the Secrets

Creating Secrets from files is convenient, but leaves a risk of exposing plain text. Entering values directly also leaves them in `~/.bash_history`, requiring careful history management.

**Generating a random string and immediately piping it into a Secret** avoids these risks. There are several ways to generate strings; here we use OpenSSL's `rand`:

```bash
openssl rand -base64 <byte-count> | docker secret create <secret-name> -
```

- `openssl rand <bytes>` generates that many random bytes for a password.
- `-base64` encodes them using alphanumeric characters and some special characters for broader usability.

This leaves no generated string stored as plain text on the system or exposed in transit between host and container. Its contents can be read only by directly accessing `/run/secrets/<secret>` inside a container using it.

Create `mysql_root_password` and `mysql_password`:

```bash
openssl rand -base64 32 | docker secret create mysql_root_password -
openssl rand -base64 32 | docker secret create mysql_password -
```

Check their presence:

```bash
ubuntu@sjhong-node-01:~$ docker secret ls

ID                          NAME                  DRIVER    CREATED              UPDATED
sjhong-secret-001-25chars   mysql_password                  About a minute ago   About a minute ago
sjhong-secret-002-25chars   mysql_root_password             About a minute ago   About a minute ago
```

### Apply Secrets to the Service

Deploy `db` with the Secrets:

```bash
docker service create \
  --name db \
  --env MYSQL_USER="seongjin" \
  --env MYSQL_DATABASE="seongjin_test" \
  --env MYSQL_ROOT_PASSWORD_FILE="/run/secrets/mysql_root_password" \
  --env MYSQL_PASSWORD_FILE="/run/secrets/mysql_password" \
  --secret source=mysql_root_password,target=mysql_root_password \
  --secret source=mysql_password,target=mysql_password \
  --mount type=volume,source=db-data,destination=/var/lib/mysql \
  --replicas 1 \
  mysql:latest
```

- `--env` specifies environment variables as `VARIABLE=value`.
- `--secret` mounts a Secret: `source` is its name and `target` its mounted filename under `/run/secrets/`.
- Put those paths in `MYSQL_ROOT_PASSWORD_FILE` and `MYSQL_PASSWORD_FILE`. **Notice the added _FILE suffix.** [The official MySQL image](https://hub.docker.com/_/mysql) lets certain sensitive variables receive a file path instead of a value.
- `--mount` configures the `db-data` Docker volume for database storage.
- MySQL requires either `MYSQL_ROOT_PASSWORD` or `MYSQL_ROOT_PASSWORD_FILE`; the other variables are optional.

### Read Secret contents

Original Secret data can be read only inside a container where it is mounted. For example, the password referenced by `MYSQL_PASSWORD_FILE` is stored at `/run/secrets/mysql_password` inside a `db` container.

Use `docker container exec` to inspect the actual `mysql_root_password` data:

```bash
# To execute a command inside a container,
# use docker container exec <flags> <container-ID> <command>.
ubuntu@sjhong-node-01:~$ docker container exec $(docker ps --filter name=db -q) cat /run/secrets/mysql_password

# The password generated earlier with openssl rand -base64 is printed.
```

### Verify the password

Check that the Secret-supplied password works in MySQL. Add `-it` to `docker container exec` to run the login command interactively:

```bash
# Connect to MySQL in the db container as root.
ubuntu@sjhong-node-01:~$ docker container exec -it $(docker ps --filter name=db -q) bash -c 'mysql -u root -p'

# Enter the password read from the Secret above.
Enter password:

# The following confirms a successful MySQL root login.
Welcome to the MySQL monitor.  Commands end with ; or \g.
Your MySQL connection id is 8
Server version: 8.0.30 MySQL Community Server - GPL

Copyright (c) 2000, 2022, Oracle and/or its affiliates.

Oracle is a registered trademark of Oracle Corporation and/or its
affiliates. Other names may be trademarks of their respective
owners.

Type 'help;' or '\h' for help. Type '\c' to clear the current input statement.

mysql>
```

### Detach and delete Secrets

Like Configs, Secrets must be detached before deletion. Trying to remove `mysql_password` now produces:

```bash
ubuntu@sjhong-node-01:~$ docker secret rm mysql_root_password

# An error identifies the Service using this Secret.
Error response from daemon: rpc error: code = InvalidArgument desc = secret 'mysql_root_password' is in use by the following service: db
```

After MySQL initializes, account information resides in its database. Because `db-data` persists that data, the Service retains those accounts on subsequent runs. Secrets needed only for initialization, `mysql_root_password` and `mysql_password`, therefore no longer need to stay attached.

Detach them with `docker service update`. **Remove their associated environment variables too**:

```bash
docker service update \
  --secret-rm mysql_root_password \
  --secret-rm mysql_password \
  --env-rm MYSQL_ROOT_PASSWORD_FILE \
  --env-rm MYSQL_PASSWORD_FILE \
  db
```

Updating redeploys and reschedules containers with the changes. Check whether the previously visible root password remains:

```bash
ubuntu@sjhong-node-01:~$ docker container exec $(docker ps --filter name=db -q) cat /run/secrets/mysql_root_password

# The Secret data is gone, so the target cannot be found.
cat: /run/secrets/mysql_root_password: No such file or directory
```

Once detached, remove the Secrets with `docker secret rm`. Secrets remain in the cluster even if their Service stops or is deleted, so regularly remove unneeded ones:

```bash
docker secret rm mysql_root_password mysql_password

# Successful deletion prints the Secret name.
mysql_root_password
mysql_password
```

## References

- [Docker Docs: Manage sensitive data with Docker secrets](https://docs.docker.com/engine/swarm/secrets/)
- [Docker Docs: docker secret create](https://docs.docker.com/engine/reference/commandline/secret_create/)
- [Docker Docs: docker service create](https://docs.docker.com/engine/reference/commandline/service_create/)
- [Docker Docs: docker service update](https://docs.docker.com/engine/reference/commandline/service_update/)
