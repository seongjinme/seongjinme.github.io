---
title: "Raft Consensus, Quorum, and Fault Tolerance in Distributed Systems"
description: "Raft is a consensus algorithm designed to keep nodes in a distributed system synchronized and up to date while providing fault tolerance."
pubDate: "2022-08-17T15:00:06.000Z"
tags: ["system"]
lang: en
---

In the previous article, we explored [what happens when a manager node is forcibly removed from a multi-node Docker Swarm cluster](/en/docker-swarm-introduction-nodes/#what-happens-when-you-forcibly-remove-a-manager-node). With three managers, losing one was fine. With two, losing just one disabled cluster management. This may seem surprising, but it is natural in a distributed system using the Raft consensus algorithm.

This article examines **Raft**, designed for fault tolerance in distributed systems. We will also explore **quorum**, a key part of consensus algorithms, and the optimal number of nodes needed to satisfy it.

My focus is to explain the mechanism as simply as possible for engineers managing clusters and learners aspiring to those roles. Resources for a detailed technical understanding appear in the closing section.

## The Raft consensus algorithm

Raft is a consensus algorithm designed to **keep every node in a distributed system in the same state** and **allow the system to function even when some nodes fail**.

Diego Ongaro and John Ousterhout first presented it in their 2014 paper, ["In Search of an Understandable Consensus Algorithm"](https://raft.github.io/raft.pdf). They aimed for a structure easier to understand and implement than alternatives such as Paxos. It is now used in various areas, including Kubernetes etcd clusters and MongoDB replica sets.

#### Why the name Raft?

[Wikipedia traces the name to "Reliable, Replicated, Redundant and Fault-Tolerant"](https://en.wikipedia.org/wiki/Raft_\(algorithm\)), but that is only part of the story.

Interestingly, Diego Ongaro left [an account, or perhaps a confession, of the naming process](https://groups.google.com/g/raft-dev/c/95rZqptGpmU/m/cfH4N7reBQAJ) on Google Groups. Some main points:

- He was thinking of words such as reliable, replicated, redundant, and fault-tolerant, without specifically intending an acronym.
- He thought about logs and what could be made from them. _Here, "log" also means a piece of timber._
- He wondered how to escape the "island" of Paxos, the established consensus algorithm.

![Quite literally, a raft made from logs.](/content/images/2022/08/wooden-raft.jpg)

Personally, the second and third stories appeal to me more than the first one on Wikipedia. There is a little wordplay, along with the ambition to move beyond an established paradigm. The account has other entertaining details too; I recommend reading it if you are curious. The pain of naming things really is universal.

### How it works

Every node in a Raft-based system has one of three states. Normally there is one leader and the rest are followers. Candidates exist temporarily only when the leader is absent or unresponsive.

1. **Leader:** The single node representing the cluster. It receives, propagates, and responds to all client commands, and periodically sends heartbeats to followers.
2. **Follower:** All other nodes remain followers while a leader exists, handling commands propagated by it.
3. **Candidate:** A follower changes into a candidate when no leader is available, so a new leader can be chosen. This occurs after it receives no heartbeat for a specified time.

In Raft, **cluster commands propagate in one direction, from leader to followers**. In brief:

![Communication between nodes. Source: ScyllaDB.](/content/images/2022/08/raft-consensus-diagram.png)

1. The leader **creates a log for a received command, stores it locally, and replicates it to all followers**. Each follower acknowledges the log.
2. Once acknowledgments reach **a majority of cluster nodes**, the leader has **the command in the log executed consistently across the cluster** and returns the result to the client. It periodically resends the log until all nodes have the same copy.
3. A follower that could not process commands because of system or network trouble receives the missing logs when it recovers and reconnects, then executes them in order. This maintains **cluster-wide synchronization and up-to-date state**.

### Leader election

The leader is clearly central to Raft. How is it chosen? Put simply, by a vote requiring majority approval. This is **leader election**.

First, three terms:

- **Term:** A numbered period, like a first or second term in political office. It covers an election and the service of the leader elected in it.
- **Election timeout:** The time a follower waits before becoming a candidate. Each follower and candidate receives a different random value between 150 and 300 ms.
- **Heartbeat:** A message the leader repeatedly sends to followers at regular intervals. It carries no client command log and serves only to maintain the leader's status.

The election proceeds as follows:

1. Without a leader, all nodes remain followers and wait for their election timeouts.
2. The first to time out becomes a candidate and starts a new term. It votes for itself and sends vote requests to the others.
3. A node receiving a request votes for that candidate if it has not already voted in the term, then resets its election timeout. This prevents additional candidates from appearing alongside those already competing.
4. A candidate receiving votes from **a majority of all nodes** becomes leader for the term.

The new leader sends periodic heartbeats. Each follower resets its timeout on receiving one and stays a follower. As long as the leader operates normally, the cluster retains one leader and the remaining followers.

#### What if the leader fails?

A follower that receives no leader message within its election timeout **immediately becomes a candidate**. The **term increases by one**, and **a new election begins**, following the election steps described above.

Each node stores its current term and includes it in messages. When a former leader recovers and reconnects, it compares the cluster's term with its own. Finding its term lower, **the former leader becomes a follower**.

![A summary of node state transitions. Source: the original paper.](/content/images/2022/08/raft-node-status.png)

#### What if nobody wins a majority?

Occasionally another election is needed. For example, in a four-node cluster, two candidates might appear simultaneously and each receive two votes.

If such a **split vote** leaves no majority, **the term ends and another election begins in a new term**. To avoid another tie, Raft randomizes candidate election timeouts again at each election. The subsequent procedure is the same as above.

If too many nodes are down for anyone to obtain a majority, however, no leader can be elected. Because commands propagate only from leader to followers, **the absence of a leader halts all cluster management**.

## Quorum

We can now resolve the puzzling **quorum** issue from [the previous article](/en/docker-swarm-introduction-nodes/#what-happens-when-you-forcibly-remove-a-manager-node). This term appears across many consensus algorithms, including Raft.

![The quorum error from the previous article](/content/images/2022/08/swarm-error-quorum.png)

The synchronization and election procedures above share a principle: majority approval. To apply a change in a distributed system using consensus, **at least a majority of its `N` nodes, including the node itself, must respond: at least `(N+1)/2`**. The smallest required whole number at or above `(N+1)/2` is the **quorum**, also called a **Raft quorum** in Raft.

Quorum maintains both management functionality and fault tolerance. If a majority of nodes remain healthy and responsive, the cluster can continue. **Failures affecting at most `(N-1)/2` nodes therefore do not bring down the entire cluster.** With three nodes, for example, two healthy nodes keep the cluster working while the failed node is repaired, without downtime.

**Without quorum, the cluster cannot function properly.** Revisit the Docker Swarm cluster with two managers. Its quorum is the smallest whole number at or above `(2+1)/2`, namely `2`. Losing either manager creates a problem: no leader can be elected and the cluster cannot synchronize, so its management functionality collapses.

## The optimal number of nodes for fault tolerance

For distributed systems using consensus algorithms, an **odd number of at least three nodes** is recommended:

1. At least three nodes are needed for fault tolerance.
2. An odd total permits a higher proportion of failed nodes.

For `N` nodes, given the majority requirement:

- Odd `N`, or `2k+1`: tolerates **`k` failed nodes**.
- Even `N`, or `2k`: tolerates **`k-1` failed nodes**.

| Total nodes | Required quorum | Tolerated failures |
| --- | --- | --- |
| 1 | 1 | 0 |
| 2 | 2 | 0 |
| 3 | 2 | 1 |
| 4 | 3 | 1 |
| 5 | 3 | 2 |
| 6 | 4 | 2 |
| 7 | 4 | 3 |
| 8 | 5 | 3 |
| ... | ... | ... |
| `2k` (even) | `k+1` | **`k-1`** |
| `2k+1` (odd) | `k+1` | **`k`** |

The table shows that only clusters of at least three nodes tolerate failures. Below that, there is no fault tolerance. A two-node cluster is inefficient in both resource management and fault tolerance.

An even number greater than three is entirely possible, but requires a higher proportion of functioning nodes than an odd number. Where possible, an odd-numbered cluster delivers the same fault tolerance with fewer nodes.

Raft also favors odd numbers to reduce unnecessary elections and command delays caused by split votes.

## Closing

We have briefly explored Raft, quorum, and the optimal node count for fault tolerance.

As mentioned earlier, this article prioritizes an accessible explanation of principles over technical detail. Much has been condensed or omitted. For more detail:

- **[The Raft Consensus Algorithm](https://raft.github.io/):** Introductory material, interactive demonstrations, and [the original paper](https://raft.github.io/raft.pdf).
- **[Raft Consensus, Easier Than Paxos](https://medium.com/curg/raft-consensus-%EC%9D%B4%ED%95%B4-%EA%B0%80%EB%8A%A5%ED%95%9C-%ED%95%A9%EC%9D%98-%EC%95%8C%EA%B3%A0%EB%A6%AC%EC%A6%98%EC%9D%84-%EC%9C%84%ED%95%9C-%EC%97%AC%EC%A0%95-f7ecb9f450ab):** [Dohyun Lee](https://medium.com/@scalalang2)'s clear summary of the original paper.
- **[Raft: Understandable Distributed Consensus](http://thesecretlivesofdata.com/raft/):** Accessible visualizations of the fundamentals, leader election, and log replication. Recommended if this article's explanation was difficult to follow.
- **Raft Algorithm, Explained ([Part 1](https://towardsdatascience.com/raft-algorithm-explained-a7c856529f40), [Part 2](https://towardsdatascience.com/raft-algorithm-explained-2-30db4790cdef)):** Detailed explanations of leader election and log replication for readers who want to understand how the mechanisms are implemented.
