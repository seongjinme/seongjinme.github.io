---
title: "Using JSONPath to Process JSON Data in Kubernetes"
description: "In production environments with dozens or hundreds of nodes and resources, JSONPath helps extract just the information you need. Learn its basic syntax and usage."
pubDate: "2022-04-15T09:34:45.000Z"
updatedDate: "2022-04-21T13:39:17.000Z"
tags: ["kubernetes"]
featureImage: "/content/images/2022/04/cover-1.png"
lang: en
---

## What is JSONPath?

JSONPath is an expression language designed to make JSON data structures easy to process. [Professor Stefan Gössner of Germany first proposed it in 2007](https://goessner.net/articles/JsonPath/), and that syntax remains in use with little change.

The initial implementations were in [JavaScript, PHP, and C#](https://code.google.com/archive/p/jsonpath/downloads). Today, GitHub hosts implementations in Java, PHP, Go, and other languages:

- [Jayway JsonPath (Java)](https://github.com/json-path/JsonPath)
- [JSONPath for PHP](https://github.com/SoftCreatR/JSONPath)
- [golang jsonpath library](https://github.com/oliveagle/jsonpath)

You can also try expressions online while following the examples below:

- [JSONPath Online Evaluator: jsonpath.com](https://jsonpath.com/)

## Using JSONPath

### Basic syntax

JSON groups key-value elements into objects, represented by `{}`, or arrays, represented by `[]`. Its simple structure makes JSONPath's basic syntax relatively straightforward:

- `$`: The root node, where JSONPath expressions begin.
- `@`: The current node, used in conditional filters below.
- `.`: A child node.
- `..`: Nested descendants.
- `[]`: Array indexing.
- `*`: A wildcard matching all elements.
- `?(boolean expression)`: A conditional filter expression.

The following sections explain these elements. All JSON data examples here come from [Stefan Gössner's JSONPath introduction](https://goessner.net/articles/JsonPath/).

### Working with objects

```json
{
	"bicycle": {
		"color": "red",
		"price": 19.95
	}
}
```

Use `.` to separate the current node and child nodes, with `$` representing the virtual root at the top of the path:

| Expression | Output |
| --- | --- |
| `$.bicycle` | \[{"color": "red", "price": 19.95}\] |
| `$.bicycle.color` | \["red"\] |

Note that JSONPath query results are returned as arrays. `$.bicycle.color` therefore returns `["red"]`, rather than `"red"`.

### Working with arrays

An array's `n` elements have indexes from `0` through `n-1`, in their listed order.

- Select multiple elements with commas, as in `[0,3]`.
- Select all elements with the wildcard `*`.
- Use `[start:end+1]` for a range. `[0:3]` selects indexes `0` through `2`.
- Use `[start:end+1:step]` to specify a range and step.

Negative indexes from `-1` through `-n` count backward. A negative index alone may not work in some environments, so prefer range syntax:

- Select the final element with `[-1:0]` or `[-1:]`.
- Select the final three with `[-3:]`.

Consider these expressions against the following example:

```json
{
	"book": [
		{
		"category": "fiction",
			"author": "Herman Melville",
			"title": "Moby Dick",
			"isbn": "0-553-21311-3",
			"price": 8.99
		},
		{
			"category": "fiction",
			"author": "J. R. R. Tolkien",
			"title": "The Lord of the Rings",
			"isbn": "0-395-19395-8",
			"price": 22.99
		}
	]
}
```

| Expression | Output |
| --- | --- |
| `$.book[0:1].isbn` | \["0-553-21311-3"\] |
| `$.book[-1:].title` | \["The Lord of the Rings"\] |
| `$.book[*].category` | \["fiction", "fiction"\] |

### Conditional filters

Conditional filtering is a core JSONPath feature. Boolean expressions returning only `TRUE` or `FALSE` quickly select data matching a condition.

Write filters as `?(boolean expression)`. They support basic operators such as `==`, `!=`, `>`, `<`, `>=`, and `<=`. Some implementations also provide `in`, `nin`, and others.

Consider:

```json
{
	"store": {
		"book": [
			{
				"category": "reference",
				"author": "Nigel Rees",
				"title": "Sayings of the Century",
				"price": 8.95
			},
			{
				"category": "fiction",
				"author": "Evelyn Waugh",
				"title": "Sword of Honour",
				"price": 12.99
			},
			{
			"category": "fiction",
				"author": "Herman Melville",
				"title": "Moby Dick",
				"isbn": "0-553-21311-3",
				"price": 8.99
			},
			{
				"category": "fiction",
				"author": "J. R. R. Tolkien",
				"title": "The Lord of the Rings",
				"isbn": "0-395-19395-8",
				"price": 22.99
			}
		],
		"bicycle": {
			"color": "red",
			"price": 19.95
		}
	}
}
```

| Expression | Output |
| --- | --- |
| `$..book[?(@.price < 10)].title` | \["Sayings of the Century", "Moby Dick"\] |
| `$.store..[?(@.category == "reference")].author` | \["Nigel Rees"\] |
| `$.store.[?(@.category == "reference")][title,author]` | \["Sayings of the Century", "Nigel Rees"\] |
| `$.store.[?(@.color == "red")].price` | \[19.95\] |

## Using JSONPath in Kubernetes

Kubernetes supports JSONPath templates when querying cluster configuration, nodes, and resources. They reveal information unavailable in the default `kubectl get` output and let you sort results as needed. Even in production environments managing dozens of nodes, templates help you extract only what matters.

The following briefly summarizes techniques introduced in [Mumshad Mannambeth's Certified Kubernetes Administrator (CKA) with Practice Tests](https://www.udemy.com/course/certified-kubernetes-administrator-with-practice-tests/).

### Basic syntax

First, become familiar with `kubectl get <resource> -o json`. You need to understand the output's JSON structure to use JSONPath effectively.

Add `-o jsonpath='{expression}'` to a Kubernetes `get` command. To list only the images used by Pods:

```bash
kubectl get pods -o jsonpath='{.items[*].spec.containers[*].image}'
```

- Enclose each expression in braces (`{}`), and the entire combination in single or double quotes.
- The root symbol `$` is optional. Without it, begin with `.`.

You can combine expressions to query several fields at once. This lists node names and allocated CPU counts:

```bash
kubectl get nodes -o jsonpath='{.items[*].metadata.name}{"\n"}{.items[*].status.capacity.cpu}'

# Example output from the command above:
# master01 worker01
# 4        4
```

- Separate expressions with their own `{}`.
- Use `{"\n"}` for a newline and `{"\t"}` for a tab.

### Iterating over a list

Kubernetes combines JSONPath expressions with `range` and `end` to produce repeating lists.

Here are pseudocode and an implementation using JSONPath with `range` for the node-name and CPU example:

```bash
# Pseudocode
FOR EACH NODE
  PRINT NODE NAME \t PRINT CPU COUNT\n
END FOR

# JSONPath expression
'{range .items[*]}
  {.metadata.name}{"\t"}{.status.capacity.cpu}{"\n"}
{end}'
```

Combine the expression with `kubectl get -o jsonpath`:

```bash
kubectl get nodes -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.status.capacity.cpu}{"\n"}{end}'

# Example output from the command above:
# master01	4
# worker01	4
```

### Naming output columns

To name each column, use `-o custom-columns` instead of `-o jsonpath`. Separate columns with commas; braces are unnecessary. The basic syntax is:

```bash
kubectl get <resource> -o custom-columns=<NAME1>:<PATH>,<NAME2>:<PATH>,...
```

Add column names `NAME` and `CPU` to our node example:

```bash
kubectl get nodes -o custom-columns=NODE:.metadata.name,CPU:.status.capacity.cpu

# Example output from the command above:
# NODE		CPU
# master01	4
# worker01	4
```

Notice that `.items[*]` is absent from the expressions. `kubectl get` already assumes data under that path, so with `-o custom-columns`, specify only the path after `.items[*]`.

### Sorting results

JSONPath also sorts query results. Use `--sort-by=<PATH>`, without braces, for ascending order. These examples come from the [kubectl cheat sheet](https://kubernetes.io/docs/reference/kubectl/cheatsheet/):

```bash
# List Services sorted by name
kubectl get services --sort-by=.metadata.name

# List Pods sorted by restart count
kubectl get pods --sort-by='.status.containerStatuses[0].restartCount'

# List PVs sorted by capacity
kubectl get pv --sort-by=.spec.capacity.storage
```

Here too, `.items[*]` is omitted. With `--sort-by`, start the expression from the path after it.

## References

- [JSONPath: XPath for JSON](http://goessner.net/articles/JsonPath/)
- [Kubernetes Documentation: JSONPath Support](https://kubernetes.io/docs/reference/kubectl/jsonpath/)
- [Kubernetes Documentation: kubectl Cheat Sheet](https://kubernetes.io/docs/reference/kubectl/cheatsheet/)
- [Mumshad Mannambeth's CKA preparation course](https://www.udemy.com/course/certified-kubernetes-administrator-with-practice-tests/)
