# Lab 2 — Peer Review Record

| Role | Name | Student ID | GitHub |
|------|------|------------|--------|
| Author | Chanon Lhumsa-ard | 67070501059 | [@Snnn3](https://github.com/Snnn3) |
| Peer reviewer | Worawut Sereethai | 67070501040 | [@YummieGG](https://github.com/YummieGG) |

## Pull Requests I authored (reviewed by my partner)

| PR | Branch | Reviewer verdict |
|----|--------|------------------|
| https://github.com/Snnn3/TokTickIT/pull/25 | feature/lab2-1-contract | Approved |
| https://github.com/Snnn3/TokTickIT/pull/26 | feature/lab2-2-data | Approved |
| https://github.com/Snnn3/TokTickIT/pull/27 | feature/lab2-3-requester-context | Approved |
| https://github.com/Snnn3/TokTickIT/pull/28 | feature/lab2-4-create-ticket | Approved |
| https://github.com/Snnn3/TokTickIT/pull/29 | feature/lab2-5-my-tickets | Approved |
| https://github.com/Snnn3/TokTickIT/pull/30 | feature/lab2-6-detail-attachments | Pending Review |

### Reviewer comments I received and how I responded

**PR #25 — feature/lab2-1-contract**
- **Reviewer comment:** "Good job. The specifications are extremely clear and detailed, especially the expansion of the Business Rules covering all edge cases. The API and UI specs perfectly align with the Lab 02 requirements. Approved!"
- **How I responded:** "Thank you for the review and approval! Glad the expanded business rules and API/UI specs look clear and aligned with the Lab 02 criteria."

**PR #26 — feature/lab2-2-data**
- **Reviewer comment:** "LGTM! The code perfectly matches the spec and there are no outstanding issues. Passed. I will merge this PR right away."
- **How I responded:** "Thank you! Really appreciate the review."

**PR #27 — feature/lab2-3-requester-context**
- **Reviewer comment:** "The implementation for the Development Requester selection screen and its context looks good! I've reviewed the code and everything meets the specifications. Outstanding job! Approved."
- **How I responded:** "Thank you for approved my PR."

**PR #28 — feature/lab2-4-create-ticket**
- **Reviewer comment:** "Great job! The implementation of ticket_number_seq within a database transaction is a very solid approach. The file upload validation rules (size, count, MIME types) and the UI states align perfectly with our specifications. Test coverage is also spot on. Looks great to me, Approved!"
- **How I responded:** "Thank you for reviewing the ticket number generation sequence, transaction locking, and file upload validations!"

**PR #29 — feature/lab2-5-my-tickets**
- **Reviewer comment:** "Great job on this one! The API query validation is solid, and the 300ms debounce on the search input is a great UX touch. I also love how you separated the Empty state from the No-results state perfectly. Approved!"
- **How I responded:** "Thank you for aproving and merging my PR."
---

## Pull Requests I reviewed for my partner

| PR | Branch | My verdict |
|----|--------|------------|
| https://github.com/YummieGG/toktickit/pull/19 | docs/lab2-specification | Approved |
| https://github.com/YummieGG/toktickit/pull/20 | feature/lab2-database | Approved |
| https://github.com/YummieGG/toktickit/pull/21 | feature/lab2-3-requester-context | Approved |
| https://github.com/YummieGG/toktickit/pull/22 | feature/lab2-4-ticket-creation | Changes requested |

### My comments and partner's responses

**PR #19 — docs/lab2-specification**
- **My comment:** "Great job! The specifications and test plans are complete and fully aligned with the Lab 02 labsheet:\n\nSpec & API: Covers all FRs, BRs, data models, and REST contracts.\nUI Spec: Follows Zen Green tokens and the 19 Appendix C checklist items.\nTest Plan: 82 planned tests with complete AC traceability."
- **Partner's response:** "Thanks."

**PR #20 — feature/lab2-database**
- **My comment:** "The Prisma schema, migrations, and seed script perfectly fulfill:\n- All models, relationships, indexes, and enums match `specification.md` and Section 5 of the labsheet.\n- Seed data includes 4 categories, 6 systems, 4 active + 1 inactive requesters."
- **Partner's response:** "Thank you very much"

**PR #21 — feature/lab2-3-requester-context**
- **My comment:** "Great job! The Development Requester Selection and App Shell:\n- `GET /api/requesters` returns active requesters sorted alphabetically.\n- Session persists in `sessionStorage` and clears properly on \"Change Requester\".\n- UI adheres to Zen Green `#006B3C` styling and includes the mandatory test-mode warning banner.\n- Both server API tests and client component tests pass.\nLGTM!."
- **Partner's response:** *(Merged upon approval)*

**PR #22 — feature/lab2-4-ticket-creation**
- **My comment:** "Great progress on implementing the Create Ticket fullstack slice! Before merging into lab2-staging, there are a few blocking contract & concurrency items to address:
  1. Foreign Key Existence & isActive Validation (BR-05, BR-24, BR-25): Verify existence and isActive: true before inserting to avoid 500 DB constraint errors.
  2. Race Hazard in Ticket Number Generation (BR-01): Atomic sequence / transaction needed for sequential ticket numbers.
  3. API Response Contract Mismatch (POST /api/tickets): Response must include expanded category, relatedSystem, and requester objects.
  4. Hardcoded localhost:3000 API origin in CreateTicket.tsx: Use relative endpoints / Vite proxy.
  5. UI/Spec refinements: Field-level error formats, Zen Green focus rings/badges, and submission busy states.
  Verdict: Changes requested."
- **Partner's response:** *(Pending partner updates)*

