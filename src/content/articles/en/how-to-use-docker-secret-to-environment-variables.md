---
title: "A Shell Script for Injecting Docker Swarm Secrets as Environment Variables"
description: "Docker Swarm Secrets are mounted as files. Learn how to use them as environment variables in images that do not support file-based input."
pubDate: "2022-11-09T02:06:37.000Z"
tags: ["docker", "shell-script"]
featureImage: "/content/images/2022/11/cover.png"
lang: en
---

Swarm provides **Secrets** to manage sensitive data separately. Secret data resides in a container's in-memory filesystem, and the Service uses it through environment variables to run the application.

The approach is intuitive but has a serious limitation: **an application image without support for file-based environment input cannot use Swarm Secrets as environment variables**.

Consider the [Ghost image](https://hub.docker.com/_/ghost) used by this blog as of November 2022. On the manager node, I created individual Secrets for database connection settings and inserted them into deployment YAML:

```yaml
version: '3.9'

services:
  ghost:
    image: ghost:5
    ...
    environment:
      database__client: mysql
      database__connection__host: /run/secrets/ghost_db_host
      database__connection__user: /run/secrets/ghost_db_user
      database__connection__password: /run/secrets/ghost_db_password
      database__connection__database: /run/secrets/ghost_db_database
      ...
    secrets:
      - ghost_db_host
      - ghost_db_user
      - ghost_db_password
      - ghost_db_database
  db:
    image: mysql:8
    ...
    environment:
      MYSQL_ROOT_PASSWORD_FILE: /run/secrets/ghost_db_password
    secrets:
      - ghost_db_password
...
```

Although I followed successful examples, `ghost` would not start correctly. Its Task logs showed:

```
[2022-11-03 04:43:19] INFO Ghost is running in production...
[2022-11-03 04:43:19] INFO Your site is now available on http://localhost:8000/
[2022-11-03 04:43:19] INFO Ctrl+C to shut down
[2022-11-03 04:43:19] INFO Ghost server started in 0.663s
[2022-11-03 04:43:19] ERROR Invalid database host.

Invalid database host.

"Please double check your database config."

Error ID:
    500

Error Code:
    ENOTFOUND

----------------------------------------

Error: getaddrinfo ENOTFOUND /run/secrets/ghost_db_host
    at /var/lib/ghost/versions/5.22.4/node_modules/knex-migrator/lib/database.js:50:23
    at GetAddrInfoReqWrap.onlookup [as oncomplete] (node:dns:109:26)
```

`getaddrinfo ENOTFOUND <text>` indicates an unrecognized host. Notice the text: instead of reading the data at the mounted `ghost_db_host` path, Ghost received the path itself. This caused startup to fail.

Swarm Secrets are commonly referenced through environment values such as `/run/secrets/<secret-name>`. The manager passes environment values directly to the container, without processing them. **Reading the file and using its contents as an environment value is the container's responsibility, not the manager's.** An image not built for that scenario cannot inject Secrets this way.

Fortunately, many official Docker Hub images provide dedicated variables for Secrets. [MySQL supports the _FILE suffix for five sensitive account-related variables](https://hub.docker.com/_/mysql). What can we do for images without that support?

There is a way. Though somewhat cumbersome, **a shell script combined with a Dockerfile** makes it possible:

1. Write the shell script.
2. Create a Dockerfile for an extension image.
3. Build that image.
4. Deploy it.

## Write the shell script

The script below is based on **code in the official MySQL 8 image's docker-entrypoint.sh**. Many official images, including [WordPress](https://hub.docker.com/_/wordpress), [MongoDB](https://hub.docker.com/_/mongo), and [PostgreSQL](https://hub.docker.com/_/postgres), support Swarm Secrets in the same way. Our example uses the [official Ghost 5.x image](https://hub.docker.com/_/ghost).

Call the script `add-file-env.sh`. It will:

1. Store the variable names needing Secret support in an array.
2. For each variable, read a value from the file referenced by its `_FILE` counterpart if supplied; otherwise use the original environment variable.
3. Repeat this process for every variable in the array.

Applying this code was not easy for me as a shell scripting beginner. I have added explanations for anyone facing the same difficulty.

### 1. Declare the variable array

```bash
# Import original DB envs of Ghost5
envs=(
	"database__connection__host"
	"database__connection__user"
	"database__connection__password"
	"database__connection__database"
)
```

Bash declares arrays as `variable=(value1 value2 value3)`. Here, `envs` holds database variables required for Ghost in production. [See the full database configuration list.](https://ghost.org/docs/config/#database)

### 2. Define file_env()

```bash
# file_env() function imported from MySQL8 docker image
# usage: file_env VAR [DEFAULT]
#    ie: file_env 'XYZ_DB_PASSWORD' 'example'
# (will allow for "$XYZ_DB_PASSWORD_FILE" to fill in the value of
#  "$XYZ_DB_PASSWORD" from a file, especially for Docker's secrets feature)
file_env() {
	local var="$1"
	local fileVar="${var}_FILE"
	local def="${2:-}"
	if [ "${!var:-}" ] && [ "${!fileVar:-}" ]; then
		echo >&2 "Both $var and $fileVar are already set"
		exit 1
	fi
	local val="$def"
	if [ "${!var:-}" ]; then
		val="${!var}"
	elif [ "${!fileVar:-}" ]; then
		val="$(< "${!fileVar}")"
	fi
	export "$var"="$val"
	unset "$fileVar"
}
```

`file_env()` implements file-based environment input. Call it as `file_env VARIABLE [DEFAULT]`:

1. Its first argument is an environment variable name from the array. The optional second argument supplies its default.
2. If `VARIABLE_FILE` has a value in the container configuration, read the referenced file and assign its contents to `VARIABLE`.
3. If `VARIABLE_FILE` exists but is empty, use the default argument.
4. If `VARIABLE_FILE` does not exist, use the original `VARIABLE` value.

The code is short, but unfamiliar Bash syntax can make it difficult to follow. Let us examine it more closely.

```bash
local var="$1"
local fileVar="${var}_FILE"
local def="${2:-}"
```

- `local` declares a function-local variable. Without it, as with `envs`, a variable is global.
- `$1`, `$2`, and so on refer to arguments in the order supplied.
- `${variable}` substitutes a variable's value.
- `:-` is a parameter expansion operator, normally `${variable:-word}`. It substitutes `word` if the variable is null or unset. With no word, it substitutes an empty value.

```bash
if [ "${!var:-}" ] && [ "${!fileVar:-}" ]; then
	echo >&2 "Both $var and $fileVar are already set"
	exit 1
fi
```

- `${!variable}` refers to [the value of another variable whose name is stored in variable](https://stackoverflow.com/questions/23817820/bash-what-does-mean-as-in-echo-var). If that variable is missing or has no value, an empty value is returned.
- `>&2` in `echo >&2 "message"` directs output to `stderr`.
- Thus, if both the direct variable, `var`, and its file-based counterpart, `fileVar`, are set, this code prints an error to `stderr` and exits.

```bash
local val="$def"
if [ "${!var:-}" ]; then
	val="${!var}"
elif [ "${!fileVar:-}" ]; then
	val="$(< "${!fileVar}")"
fi
```

- `<` redirects input. `$(< "${!fileVar}")` reads the file at the path stored in the variable named by `fileVar`.
- The code selects `val`: prefer `${!var:-}`, otherwise read the file referenced by `${!fileVar:-}`, otherwise use the supplied default, `$def`.

```bash
export "$var"="$val"
unset "$fileVar"
```

- Assign the selected `$val` to `$var` and export it, then unset the temporary file-based variable named by `$fileVar`.

### 3. Inject each variable

```bash
# Run file_env() to fill the value of every original env from either $var or $fileVar
for env in "${envs[@]}"; do
	file_env "$env"
done
```

- `@` in `${envs[@]}` represents every array index.
- This loop calls `file_env()` for each name in `envs`.

### 4. Load the original entrypoint

Most images include an entrypoint script needed for startup. Our new script must also execute it for the container to function properly.

Inspect the original script and determine when it should run relative to the new logic. For Ghost, **the base image's [docker-entrypoint.sh](https://github.com/docker-library/ghost/blob/master/5/debian/docker-entrypoint.sh) must run after add-file-env.sh**. Add this at the end:

```bash
# Call the original entrypoint bash script
source docker-entrypoint.sh
```

- Bash's `source` reads and executes a file **in the same process**, sharing its variables and functions.
- The Debian Ghost [Dockerfile](https://github.com/docker-library/ghost/blob/master/5/debian/Dockerfile) places `docker-entrypoint.sh` in `/usr/local/bin`, so no explicit path is required here.

### 5. Combine the script

Putting the pieces into `add-file-env.sh` gives:

```bash
#!/bin/bash
set -euo pipefail

# file_env() function imported from MySQL8 docker image
# usage: file_env VAR [DEFAULT]
#    ie: file_env 'XYZ_DB_PASSWORD' 'example'
# (will allow for "$XYZ_DB_PASSWORD_FILE" to fill in the value of
#  "$XYZ_DB_PASSWORD" from a file, especially for Docker's secrets feature)
file_env() {
	local var="$1"
	local fileVar="${var}_FILE"
	local def="${2:-}"
	if [ "${!var:-}" ] && [ "${!fileVar:-}" ]; then
		echo >&2 "Both $var and $fileVar are already set"
		exit 1
	fi
	local val="$def"
	if [ "${!var:-}" ]; then
		val="${!var}"
	elif [ "${!fileVar:-}" ]; then
		val="$(< "${!fileVar}")"
	fi
	export "$var"="$val"
	unset "$fileVar"
}

# Import original DB envs of Ghost5
envs=(
	"database__connection__host"
	"database__connection__user"
	"database__connection__password"
	"database__connection__database"
)

# Run file_env() to fill the value of every original env from either $var or $fileVar
for env in "${envs[@]}"; do
	file_env "$env"
done

# Call the original entrypoint bash script
source docker-entrypoint.sh
```

Notice the first two lines:

```bash
#!/bin/bash
set -euo pipefail
```

- `#!` selects the interpreter. `#!/bin/bash` directs the system to run the script with Bash.
- `set -euo pipefail` exits Bash with an error code when script execution encounters an error. You would not want a mistaken interactive command to close your terminal, but these options are necessary for this script. [See this explanation for details.](https://gist.github.com/mohanpedala/1e2ff5661761d3abd0385e8223e16425)

## Create the extension image Dockerfile

An **extension image** builds on an existing image with additions needed for development or production. We will extend `ghost:5` with `add-file-env.sh`.

Create `Dockerfile` beside the script:

```dockerfile
FROM ghost:5

COPY add-file-env.sh /usr/local/bin
RUN chmod +x /usr/local/bin/add-file-env.sh
ENTRYPOINT ["add-file-env.sh"]

CMD ["node", "current/index.js"]
```

- `FROM` chooses the base image.
- `COPY` places the script in `/usr/local/bin`.
- `RUN` makes it executable.
- `ENTRYPOINT` runs it; its location means no explicit path is necessary.
- `CMD` supplies the same Ghost startup command as the base Dockerfile.

Only one effective `ENTRYPOINT` and `CMD` can be specified:

- `ENTRYPOINT`: A command that should always run at container startup.
- `CMD`: A startup command, or parameters supplied to `ENTRYPOINT`.

The original [Ghost Dockerfile](https://github.com/docker-library/ghost/blob/master/5/debian/Dockerfile) ends with:

```dockerfile
...

COPY docker-entrypoint.sh /usr/local/bin
ENTRYPOINT ["docker-entrypoint.sh"]

EXPOSE 2368
CMD ["node", "current/index.js"]
```

Defining a new `ENTRYPOINT` in the extension overrides the base image's `ENTRYPOINT` and `CMD`. To retain correct startup, arrange for the original commands to run as well. That is why `add-file-env.sh` loads the original `docker-entrypoint.sh`, and why our Dockerfile repeats the original `CMD`.

## Build the extension image

With both files ready, [run docker build](https://docs.docker.com/engine/reference/commandline/build/) from their directory:

```bash
# Basic docker build syntax
docker build --tag <repository-name>/<image-name:version> <path>

# Build a local image using your repository name and the ghost:5 tag.
docker build --tag seongjinme/ghost:5 .
```

![A successful Ghost extension image build](/content/images/2022/11/extension-image-build.png)

## Deploy

### A brief introduction to Docker Stack

Swarm provides **stacks** for managing multi-Service applications. `docker stack` deploys applications and inspects and manages their Services and Tasks.

Stack YAML follows **Compose file version 3**. Much resembles Compose, but important differences include:

- A Service's `deploy` section specifies replicas, node placement, and `restart_policy`. Compose ignores these options.
- Stacks cannot use `build`. Images must already be built and available in a registry accessible to the cluster.
- `container_name` is unsupported because containers are managed as Service Tasks.
- `depends_on` cannot establish startup order. Use [a separate tool or script](https://docs.docker.com/compose/startup-order/).
- Use `deploy`, not `restart`, for restart policies.

See the [Compose file version 3 reference](https://docs.docker.com/compose/compose-file/compose-file-v3/) for other differences.

### Write the stack YAML

Here is my `stack.yaml`. It assumes four Secrets already exist: `ghost_db_host`, `ghost_db_user`, `ghost_db_database`, and `ghost_db_password`.

```yaml
version: '3.9'

services:
  ghost:
    # Set image below to your repository/image name.
    image: seongjinme/ghost:5
    ports:
      - 8080:2368
    environment:
      database__client: mysql
      database__connection__host_FILE: /run/secrets/ghost_db_host
      database__connection__user_FILE: /run/secrets/ghost_db_user
      database__connection__password_FILE: /run/secrets/ghost_db_password
      database__connection__database_FILE: /run/secrets/ghost_db_database
      url: http://localhost:8080
    deploy:
      replicas: 1
    secrets:
      - ghost_db_host
      - ghost_db_user
      - ghost_db_password
      - ghost_db_database
  db:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD_FILE: /run/secrets/ghost_db_password
    deploy:
      replicas: 1
    secrets:
      - ghost_db_password

secrets:
  ghost_db_host:
    external: true
  ghost_db_user:
    external: true
  ghost_db_password:
    external: true
  ghost_db_database:
    external: true
```

- Check that Secret-backed variable names end in `_FILE`, as required by our script.
- `external: true` under each Secret indicates that it was created outside this YAML.

### Deploy the stack

Everything is ready. Deploy `ghost` with `docker stack deploy`:

```bash
$ docker stack deploy --compose-file stack.yaml ghost

Creating network ghost_default
Creating service ghost_ghost
Creating service ghost_db
```

After startup, inspect the stack's Services from a manager. Each is deployed with its specified image:

```bash
$ docker stack services ghost

ID             NAME          MODE         REPLICAS   IMAGE                PORTS
lcmidpzfogqb   ghost_db      replicated   1/1        mysql:8.0
18ss20b0qdrv   ghost_ghost   replicated   1/1        seongjinme/ghost:5   *:8080->2368/tcp
```

Inspect its Tasks too. The Task in `ghost_ghost` has exited abnormally a couple of times before running successfully:

```bash
$ docker stack ps ghost

ID             NAME                IMAGE                NODE             DESIRED STATE   CURRENT STATE           ERROR                       PORTS
jygugpf8gzci   ghost_db.1          mysql:8.0            docker-desktop   Running         Running 3 minutes ago
tnvw83gwylib   ghost_ghost.1       seongjinme/ghost:5   docker-desktop   Running         Running 3 minutes ago
k8fq7wwotqe4    \_ ghost_ghost.1   seongjinme/ghost:5   docker-desktop   Shutdown        Failed 3 minutes ago    "task: non-zero exit (2)"
yqwnge1sld54    \_ ghost_ghost.1   seongjinme/ghost:5   docker-desktop   Shutdown        Failed 3 minutes ago    "task: non-zero exit (2)"
```

MySQL in `ghost_db` takes time after container startup to become ready. Ghost containers created earlier cannot yet access the configured database and exit. This may be tolerable for a personal blog, but production environments should add tools or scripts checking readiness between dependent Services.

Finally, visit the deployed blog. A newly created Ghost home page will greet you:

![The Ghost blog with Docker Secrets applied as environment variables](/content/images/2022/11/ghost-welcome-screen.png)

## Closing

> How can we handle secrets through environment variables in Docker without leaving them stored in plain text on the system?

That question arose last July while I was documenting [environment variables in Compose](/en/environment-variables-in-docker-compose/). It gave me a great deal to study. [Swarm fundamentals](/en/docker-swarm-introduction-nodes/), [Raft and fault tolerance](/en/raft-consensus-algorithm/), [Service management](/en/docker-swarm-services/), [Configs](/en/docker-swarm-config/), and [Secrets](/en/docker-swarm-secret/) were all things I learned while following it. Linking new learning together like a chain was demanding but rewarding as a student.

This article likewise collects tips from solving a problem encountered while applying those lessons to my blog. I hope it helps anyone struggling with Swarm Secrets.

## References

- [Bash essentials for beginners: shell scripting](https://blog.gaerae.com/2015/01/bash-hello-world.html)
- [Understanding Shell Script's idiom: 2>&1](https://www.brianstorti.com/understanding-shell-script-idiom-redirect/)
- [Bash Manual: 3.5.3 Shell Parameter Expansion](https://www.gnu.org/software/bash/manual/html_node/Shell-Parameter-Expansion.html)
- [Compose file version 3 reference | Docker Documentation](https://docs.docker.com/compose/compose-file/compose-file-v3/)
- [docker build | Docker Documentation](https://docs.docker.com/engine/reference/commandline/build/)
- [docker stack deploy | Docker Documentation](https://docs.docker.com/engine/reference/commandline/stack_deploy/)
