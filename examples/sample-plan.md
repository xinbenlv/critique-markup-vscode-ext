# Sample AI Coding Plan

We should {++add a persistent cache layer++} before launch.

The old sync worker should be {--removed from the bootstrap path--}.

We should migrate from {~~polling every 5s~>event-driven sync~~}.

{==Queue migration section==}{>>This rollout plan assumes the queue semantics are stable.<<}
