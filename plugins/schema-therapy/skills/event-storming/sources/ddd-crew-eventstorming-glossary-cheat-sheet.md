# EventStorming Glossary & Cheat sheet (ddd-crew)

> GATHERED SOURCE — full text stored under license.
> Source repository: https://github.com/ddd-crew/eventstorming-glossary-cheat-sheet
> Rendered site: https://ddd-crew.github.io/eventstorming-glossary-cheat-sheet/
> License: Creative Commons Attribution 4.0 International (CC BY 4.0) per repository README footer
> (NOTE: GitHub repo metadata lists CC-BY-SA-4.0; the README body badge states CC BY 4.0. Either way, free to store with attribution.)
> Maintainers/contributors: Kenny Baas-Schwegler, Chris Richardson, and community.
> Latest commit on master at time of gathering: 2024-06-06.
> Gathered verbatim from raw README on 2026-06-04.

---

EventStorming is the smartest approach to collaborate beyond silo boundaries. The power of EventStorming comes from a diverse multi-disciplined group of people who, together, have a lot of wisdom and knowledge. While it originally was invented for a workshop to model domain-driven design aggregates, it now has a broader spectrum. From gaining a big-picture problem space of the whole domain to gaining insight into the entire software delivery flow and creating a long term planning. Every one of these workshops has the same basic requirements and needs.

Here you will find a combination of a glossary of terms on EventStorming core concepts written down in a consistent and comprehensive glossary. Just be sure to try and avoid jargon as much as possible, as it sets up the unnecessary insider-outsider distinction. And a Cheat sheet that you can use facilitating your own EventStorming.

## Glossary

### Core Concepts

**Domain Event**
A Domain Event is the main concept of EventStorming. It is an event that is relevant for the domain experts and contextual for the domain that is being explored. A Domain Event is a verb at the past tense. The official EventStorming colour is orange.

**HotSpot**
Hotspots are used to visualise and capture hot conflicts. Conflicts caused by, and not exclusive to, inconsistencies (in language), frictions, questions, dissent, objections, issues or procrastinating going deep to explore for later. The official EventStorming colour is neon pink and we also slightly pivot a hotspot when we use it.

**Timeline**
EventStorming is a powerful tool when we have a story to tell, when we have a timeline. The paper roll on the wall represents time from left to right. We can have parallel streams from top to bottom on the paper roll.

**Chaotic Exploration**
Chaotic exploration can be used at the start of EventStorming. Each person writes Domain Events by themselves that they can think off. They will put these Domain Events in order they think they happen on the paper roll.

**Enforce the Timeline**
A phase happening after chaotic exploration, meaning we try to make the timeline consistent and remove duplicate stickies.

### Big Picture EventStorming

The goal of Big Picture EventStorming is to assess the health of an existing line of business or explore the viability of a new startup business model. It helps the group create a shared state of mind of the vision of that domain of the company. We can use the output as input for Conway's law alignment, organising business flow around teams and software with emergent bounded contexts. You can do these workshop with 10-30+ people on one paper roll.

**Opportunity**
Because a Hotspot can have a negative association we also give people the chance to add opportunities. We use green because of the association it has with something positive. Start using Opportunities after we made a consistent timeline.

**Actor/Agent**
Actor or Agent is a group of people, a department, a team or a specific person involved around a (group of) Domain Event(s). The official colour to use is a small yellow post-it.

**System**
A system is a deployable IT System used as a solution for a problem in the domain. When we have finished making the timeline consistent, we can start mapping systems around Domain Events. There can also be duplicates and it can be anything from using Excel to some microservice. The official colour is a wide pink post-it.

**Value**
We can add value like we would do in a value stream map, after we have made the timeline consistent. We do this to make explicit where the value is in our domain. We use the red and green small stickies to show positive and negative value.

**Pivotal Events**
With Pivotal Events, we start looking for the few most significant events in the flow. For an e-commerce website, they might look like "Article Added to Catalogue", "Order Placed", "Order Shipped", "Payment Received" and "Order Delivered". These are often the events with the highest number of people interested.

**Swimlanes**
Separating the whole flow into horizontal swimlanes, assigned to given actors or departments, is another tempting option since it improves readability. This seems the most obvious choice for people with a background in process modelling.

**Emerging Bounded Contexts**
From a Big Picture EventStorming we can picture Emerging Bounded Contexts. They are the first indicators of where to start deep-diving towards designing bounded contexts around business problems.

### Process modelling EventStorming

The goal of process modelling EventStorming is to assess the health of a current process in the company. It helps the group create a shared state of mind of the current status quo of the process, find bottlenecks and identify parts of the system to decouple from the existing software.

**Policy**
A policy is a reaction that says "whenever X happens, we do Y", eventually ending up with in the flow between a Domain Event and a Command/action. We use a big lilac post-it for these. A policy can be an automated process or manual. A policy can also be named a reactor, eventual business constraint or rule or a lie detector because there is always more to policies than you first think.

**Command/Action**
Represents decisions, actions or intent. They can be initiated by an actor or from an automated process. During process EventStorming usually, the word "Action" usually fits better with stakeholders than command because it is easier to grasp. We officially use a blue coloured post-it for it.

**Query Model/Information**
To make decisions an actor might need information, we capture these in a Query Model. For process EventStorming information might be more recognised by stakeholders. We officially use a green post-it to represent a query model.

**Enforce colour coding**
Enforcing the colour coding is playing EventStorming by the rules. Often used after or during enforcing the timeline it creates a different dynamic.

### Software Design EventStorming

The outcome of a design level EventStorming is to design clean and maintainable Event-Driven software, to support rapidly evolving businesses. Together with business stakeholders, we design a shared language and represent that in a shared model that brings value in solving a problem within a bounded context.

**Constraint**
A constraint is a restriction we have or need to design from our problem space when we want to perform a command/action, another word could be consistent business constraint or rule. The official color to use is a big yellow post-it. It was called an aggregate before which is now officially a legacy word in EventStorming, since we prefer not to use the word aggregate with business stakeholders.

## Cheat Sheet

### Preparations

#### Invites

Invites are essential to make it a successful workshop. You want to invite everyone who brings knowledge and who needs the knowledge, usually domain experts and the engineers. You want to add information about what the goal of the workshop is, and what EventStorming is. I always send the video Alberto Brandolini – 50,000 Orange Stickies Later to the attendees plus the resources page from eventstorming.com.

#### Materials

There is nothing so annoying as not having the right material, so you want to make absolutely sure you have everything needed.

#### Room setup

The best picture still is the one from the book EventStorming on leanpub. The idea is to have a modelling surface around 6-8 meters, a table for putting the materials on and a visible legend for people to see. We want to have no seats in sight. Also, you want a room preferable where the windows can open so you can have fresh oxygen in the room and have some food or candies lying around.

#### Facilitation

For an effective EventStorming workshop, you want to have a dedicated facilitator.

As a facilitator:

* You want to have a neutral role so that you can cut long discussions short and visualise them with hotspots.
* You need to find to balance to when you will intervene and when you will let the discussion flow.
* You are always the first in the room and the last to leave, so you can set up the room correctly and talk with people afterwards.
* It is your job to facilitate the group and give them feedback and insights about the group interaction so that they can decide what to do.
* You have to observe and let the group figure out what their needs are, however sometimes you need to decide for them when the group can't.

### Workshop process

#### Check-in

Start a workshop with a check-in. It is essential to be present physically and mentally for the workshop. Ask the attendees questions about how it is going with them. Do not discuss any workshop or work-related stories. Always check-in first as a facilitator and lead by example. Afterwards, let participants check-in popcorn style. When everyone is done, wrap up and summarise what you heard.

##### Agreements

Make some agreements on how we collaborate during the workshop. Make it explicit by writing this on a flip chart. Three agreements from Deep Democracy:

* Everyone is right; nobody has the monopoly on the truth.
* We start a conversation to deepen our relationship.
* We are willing to learn together.

##### EventStorming

Give an intro on EventStorming. Explain the basics of what a domain event is on the legend.

**Step 1: Chaotic exploration**
Start with asking people to write their domain events that they know of for themselves. Here people must work by themselves so that we don't bias each other. Try to avoid answering questions at this point. They can put their domain events on the paper the way they feel is correct. Do not rush this part; this is the essential part of the whole EventStorming. When people start putting their domain events on they can begin to read each other's events, but make sure they don't begin discussing them out loud; it can bias or rush the others.

**Step 2: Enforce the timeline**
After everyone is done putting their domain events on the paper, start enforcing the timeline. Ask the attendees to:

* Start discussing the events (expect a lot of noise and chaos now).
* Remove duplicate events; let them discuss if they really are duplicate events.
* Order all events in the correct timeline.
* Add structure with tape when needed, but be careful adding structure too soon. You can lose valuable insights from doing so.

**Step 3: Hotspots**
During Step 2 we will get a lot of conflicts between several perceptions, which is good. To manage these conflicts we add a pinkish sticky where there are conflicts. We call these hotspots. Hotspots can also mean pain points or questions that are unanswered. As a facilitator, you at this phase add the hotspots.

**Step 4: Add concepts when needed**
Whenever another EventStorming concept pops up, we add them to the legend and introduce these to the group. The picture that explains "almost" everything are the concepts you can add.

##### Check-out

Like the check-in, end a workshop with a check-out. Stand in a circle with everyone and ask them what their thought was about the workshop.

> Remember, Alberto calls EventStorming like a pizza. The paper roll and domain events are the base of your pizza, the dough, but you put your ingredients on top of it the way you like it.

## Sources cited by the cheat sheet

* EventStorming.com — https://eventstorming.com
* Leanpub: Introducing EventStorming — https://leanpub.com/introducing_eventstorming
* Leanpub: DDD First 15 years — https://leanpub.com/ddd_first_15_years (Discovering Bounded Contexts with EventStorming — Alberto Brandolini)
* Alberto Brandolini — https://twitter.com/ziobrando
