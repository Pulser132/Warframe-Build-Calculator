---
name: planner
description: Creates a plan and checklist to meet a given goal. Use when asked to create a detailed plan for a feature or project.
disable-model-invocation: true
arguments: path-to-goal-file
---

## Goal
- Find the goal `.md` file that the user has provided as an argument. The goal file will contain a description of the feature or project that the user wants to implement.

## Your Task
Given the provided goal file, interview me relentlessly about every aspect of the goal until we reach a shared understanding. Walk down each branch of the design tree, resolving dependencies between decisions one-by-one. For each question, provide your recommended answer.

Ask the questions one at a time.

If a question can be answered by exploring the codebase, explore the codebase instead.

Once we have a shared understanding of the goal, create a detailed plan.md file that breaks down the implementation into phases and tasks. The plan should be comprehensive and cover all necessary steps to achieve the goal.

Create a checklist of tasks for each phase that can be used to track progress. Each task should be actionable and specific.

Store the `Plan.md` and `Checklist.md` files in the same directory as the goal file.

Do not implement the code for the tasks, only create the plan and checklist.

## Workflow
Reach a shared understanding > Create Plan > Create Checklist > Save Plan + Checklist > Do not implement