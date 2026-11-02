---
title: "2025"
description: "Not having to explain a single thing about my past to anyone. I loved that freedom. Enough to choose a life in Germany, ten thousand kilometers from home."
pubDate: "2026-01-02T10:09:24.000Z"
tags: ["essay", "reflection", "retrospect"]
lang: en
---

## 1

I started a new life in Germany. In my forties.

An unfamiliar country, a strange city, a new career. I thought I would be excited. Once I arrived, there was no room for sentiment. Earning a living across a border required more procedures than I expected. Germany's reputation for bureaucracy was well earned. Every task involved in proving my residence status, address, income, and taxes came with inefficiency beyond anything I had imagined. Exchanging a driver's license, something that would take ten minutes in Korea, took three months here. I even had the passwords needed for mobile banking on my salary account arrive separately by post over the course of a week. My memories of adjusting to Germany are full of resignation tinged with anger.

What helped me endure the difficult move was a sense of liberation. Nobody here rudely pried into my past, birthplace, age, family relationships, plans for children, or sexual identity. Nobody seized on my career gap as a weakness. Nobody blamed illness brought on by overwork on my failure to take care of myself. Nobody looked down on me because my life did not match the age-specific checklist that Korean society so obsessively demands. I only had to explain where my professional background and skills could be useful. **Not having to explain a single thing about my past to anyone.** I loved that freedom. Enough to choose a life in Germany, ten thousand kilometers from home.

![The view on my way home from my first day at work](/content/images/2026/01/berlin.jpg)

## 2

Here is what I have done as a new software engineer since April this year. Restricted to what I can disclose, the list looks modest next to the actual workload.

- Addressed **web accessibility issues** in our internal fintech frontend products ahead of the European Accessibility Act (EAA) taking effect in June 2025. Achieved a Lighthouse Accessibility Score of 100% on every page and automated accessibility checks by integrating axe-core into the CI pipeline. A manual test expected to take around two hours became an automated process taking seconds.
- Found and fixed **a UX defect** that prevented platform-specific user themes from applying correctly in the payment flows of apps operating in twenty-five countries. The work covered writing and reviewing an ADR and developing both frontend and backend code.
- Researched a technical approach to **synchronizing our team's product UI with the different design systems of several internal platforms**. Following RFC approval, it became one of the team's initiatives for next year.
- Implemented **A/B testing and logging** for a core team product using our internal feature flag tool, beginning our **UI/UX test iterations**. This also became a key item in next year's team initiatives.
- Found and fixed **gaps in core metrics** in a major product's backend logic, then set up continuous monitoring using Grafana dashboards and alerts.
- Gave **six tech demo presentations** on my work to the broader organization, our tribe, during my first eight months. Excluding holidays, that was about once a month.

I was entrusted with substantial work almost as soon as I started this new career. A mix of circumstances and timing made that happen. I can only thank my manager and colleagues for boldly handing responsibilities to a junior who was still finding his way, and helping me through them. Here, each team member chooses tasks every quarter and takes responsibility for them end to end. Finding and solving work for oneself is an established part of the culture. That gave me several chances to raise and resolve issues I discovered while examining existing products, code, and logs.

I joined as a frontend engineer, but in practice I had to cross the boundaries of that role. If I had to describe it, I was closer to a **problem solver** contributing to the team's short- and medium-term needs without being confined to a particular technical area. I wrote React and Next.js to fix UI/UX issues, and worked on Kotlin-based products maintained by other teams when backend features or metrics needed improvement. I separately studied Grafana when observability needed work, and Terraform when I needed to handle cloud resources.

It was not an easy situation for someone just taking his first steps as an engineer. I wondered whether I was being pushed into a generalist role too early, at a time when I should be developing a distinct strength. Seen another way, though, this is an environment where I can choose my own direction of growth and immediately learn and use the relevant technology, as long as it serves the team's and organization's goals. I have never consciously thought in terms of being "full-stack." As I tried to build trust by aligning my growth with the organization's goals, the range of technologies I chose naturally widened. Sometimes, to dig deeper, you have to dig wider. I decided this was one of those times.

## 3

There were difficulties too. One A/B test involved changing when a particular button appeared in the payment interface. Putting this simple experiment into practice took a full month. The code itself had been completed early on. The problem arose elsewhere.

For a product operating simultaneously in dozens of countries, especially in a part that directly handles payments, changing even a small visual element was not simple. It required cooperation from product managers, product operations, and the product teams and engineers of the platforms involved in the experiment. Undocumented context passed informally between people, followed by unexpected operational issues, repeatedly delayed progress. At times, I, the engineer, had to propose whether the project should continue or which target to change. A test intended to launch in mid-November finally began in mid-December after two postponements. It was a painful lesson through trial and error.

The process left me with fundamental questions about the role of a tech owner. Is writing code and implementing features enough? Does being an engineer justify limiting my role to responding to technical issues? When a task involves multiple organizations and stakeholders, shouldn't I look beyond how to implement it, considering the resources, collaborators, and possible nontechnical obstacles needed to reach the goal? Isn't identifying those risks early another skill I need for managing workload and schedules? It was a valuable lesson for a new engineer.

## 4

This year alone, I met eight teammates from eight countries. None is without a story. There is never a shortage of things to talk about. Sometimes the stories hurt. Memories of war, civil war, revolution, and massacre exist here in the present, among people close to me. Listening, I come to understand that I have had the most sheltered background of us all.

Responding in English at every moment, at work and outside it, among people from such varied backgrounds is still demanding. Filtering every thought and word through a foreign language makes me feel as though more than half my ability has been cut away. The frustration of not saying everything I needed to say, correctly and at the right time, gradually accumulates. There is no helping it. It is the lot of everyone whose first language is not English. They must all have gone through a stage like mine. So please bear with me while I struggle. It may not be elegant, but you can understand me, can't you? Thoughts like these help me muddle through. At least here, I have yet to see anyone humiliated for their English accent, pronunciation, or vocabulary. Of course, that should never happen in the first place.

There is one rule I have consistently kept: I stay as far as possible from LLM services such as Gemini or ChatGPT when using English. LLMs have their own recognizable manner of speaking. Repeated words unlikely to appear in everyday conversation, long-winded sentences that fail to be concise, unnecessary flattery. These stand out quickly even among people who all speak English as a second language.

Language is a means of communication, but also a vessel for a person's identity. I do not want to outsource to AI the words that serve as the first clues to who I am. However awkward and difficult, I want to express myself in my own language, in my own way. That is how I have prepared for daily meetings and monthly demos. At work and in everyday life, I want people to continue seeing me as a whole human being.

## 5

Next year approaches, with one mountain after another.

First comes my wife's and Dooboo's move to Germany. My wife gave up what may have been the greatest career opportunity of her life for this choice. Two people born and raised in Korea, with lives established there, now have to prepare to settle with a dog in a foreign country where we have no roots, in such unsettled times. New residence permits, a new home, a forest of documents, screenings, shipments, and belongings to move. Honestly, I am afraid. I draw courage only from the prospect of being together again.

New challenges await me as an engineer too. For various reasons, less than a year into this new career, I will jointly serve as a point of contact (POC) for our frontend products during the first quarter of next year. In particular, I will be responsible for all planned feature development and operations for a new product launched under my senior mentor's lead in the second half of last year. For a junior in a large company's central organization to be entrusted with leading quarterly initiatives is a rare opportunity. I want to believe it was possible because of the trust I have built through how I work and communicate. It will also test whether I am ready for the next stage of my career.

There was little to be especially proud of in 2025, but little reason to shrink back either. I held up reasonably well. I hope I can look back on next year with the same feeling. Remembering that the life I have now is possible entirely because of my family and the kindness of those around me. All my courage came from them. As always has been.
