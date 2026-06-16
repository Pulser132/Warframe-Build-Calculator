---
name: implement-plan
description: Implements a plan and checklist. Use when asked to implement a detailed plan for a feature or project.
disable-model-invocation: true
arguments: plan-path
---

## Documents
- Find the `Plan.md` and `Checklist.md` files in the directory specified by the `plan-path` argument. These files will contain the detailed plan and checklist for the feature or project that you need to implement.

## Rules
- Execute the Plan outlined in the provided Plan.md file. This may involve creating new files, writing code, and making necessary changes to implement the feature or project as described in the plan.
- Use the Checklist.md file to track your progress. Mark tasks as completed as you finish them, and ensure that all tasks are addressed according to the plan. You must edit the checklist to reflect the completion of tasks
- Do not create new plans or checklists. Focus solely on implementing the existing plan and tracking progress with the provided checklist.
- Display summarized checklist to the user at all times while running this skill, so they can see the progress being made and what tasks are remaining.

## Workflow
Execute Plan and track each item in Checklist > Continue until all items are completed > Double-check that all Checklist items are completed > You must edit the Checklist to mark items as completed > Once all items are marked as completed, you have successfully implemented the plan.