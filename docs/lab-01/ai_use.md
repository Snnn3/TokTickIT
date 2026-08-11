# AI Use — Lab 1

**Tool 1:** opencode (CLI coding agent) with **DeepSeek V4 Flash** (`opencode/deepseek-v4-flash-free`)
**Tool 2:** Antigravity IDE with **Claude Opus 4.6 (Thinking)**

I used the opencode coding agent to help implement the TokTickIT Lab 1 vertical slice, and
later used Antigravity with Claude Opus 4.6 to audit and improve the project. All
specifications, code, tests, and Git operations were reviewed and approved by me before
submission. The prompts below are the actual prompts I gave the agents during this lab.

## Selected Key Prompts

| Prompt Name | Actual Prompt Text | My Reflection |
| ----------- | ------------------ | ------------- |
| Plan Lab 1 Implementation | "understand this pdf file" → followed by "Yes. and the 4 issues must be do in linear one by one and i must need my friend review pr." | |
| Set Up Full-Stack Project | "Let do it." (approving the proposed Phase 0 plan: git init, GitHub Project board with the 6 required statuses, four Issues in Backlog, then Issue 1 foundation work) | |
| Reset Local PostgreSQL Password | "i think i forget it. i might 1234" (the postgres password was forgotten) | |
| Fix Initial Commit & Ignore PDFs | "i want you to fix the first commit i think it might no commit anything first and add git ignore of pdf file" | |
| Restructure History & Dockerize DB | "can you delete the first commit because gitinorge and readme should init in issue 1 and can we use docker. i want you to save my prompt to md too i need it to complete ai_use.md" | |
| Implement Health Check (Issue 2) | "let move to Issue 2. I already merge pr to lab1-staging." | |
| Implement Category Feature (Issue 3) | "my friend already approve issue 2" | |
| Build and Test Check System UI (Issue 4) | "my friend is already approve my issue 3 pr" | |
| Audit Project Against Lab Sheet (Antigravity) | "can you check my project? is it contain all issue of this file @[material/Lab1_Labsheet.pdf]" (asked Antigravity to audit the project against every requirement in the lab sheet PDF) | |
| Request Improvements (Antigravity) | "did you have how to improve this project" (asked for suggestions to improve code quality) | |
| Fix README (Antigravity) | "fix only read me" → followed by "save the prompt in to ai_use.md" (applied README fixes: duplicate step numbering and missing entries in repo structure diagram, then saved prompts) | |

## Reflection

_(fill in your own reflection here)_

