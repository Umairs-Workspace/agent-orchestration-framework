@executable @docs @work @planning
Feature: In a driven session the discovery beat asks one tokened discovery question per ask, carrying its rule and example, and never defaults it

  WHY. Under a loop, refine's AskUserQuestion becomes 131's ask: the session stops, its question is
  posted, and the answer is typed back when the session resumes (ADR-002). One ask carries one
  answer text, so an ask with two tokens anchors neither (ADR-001 §2). The prose must make a driven
  session ask one question per call, carry the map on the ask's first line, and never decide a
  business rule itself.

  THE TEXT UNDER TEST: "the driven paragraph" is the paragraph of the story Contract's discovery
  bullets in "packages/core/assets/commands/refine.md" that names "AOF_RUN_ID". The checks pin
  content, not wording, as 134/05's suite does.

  Rule: R1 · A driven refine asks each business question as its own message

    Scenario: E1 · a driven session asks exactly one question per call
      Given the source "packages/core/assets/commands/refine.md"
      When the driven paragraph is read
      Then it names a driven session as one whose environment carries "AOF_RUN_ID"
      And it says each "AskUserQuestion" call in a driven session carries exactly one question

    Scenario: E3 · an interactive refine keeps its batch of up to four
      Given the source "packages/core/assets/commands/refine.md"
      When the story Contract's discovery bullets are read
      Then the rule that one call carries at most four questions is still present
      And the one-question rule is stated only for a session whose environment carries "AOF_RUN_ID"

  Rule: R2 · The message carries the map

    Scenario: E4 · the ask's first line carries the token, the discovery marker, the rule and the example
      Given the driven paragraph
      Then it says the question opens with its token
      And it says the question then names itself a discovery question
      And it says the question names the rule it bears on as "R<n> · <rule>"
      And it says the question names the example it would settle, or that it would add one
      And it names the four labels "Decision needed:", "Options:", "I would pick:" and "What the answer changes:" in that order
      And it names the 1,500-character guidance

    Scenario: the specimen ask in the paragraph reads back as a token
      Given the driven paragraph holds a specimen ask in backticks that opens with a story ref and "Q" or "E" and a number
      When the specimen is read through the package's token reader "readMapToken"
      Then it answers the specimen's own story ref and id

    Scenario: the paragraph restates no line of the map's grammar
      Given the driven paragraph
      Then no line of it opens as a map rule, example or question line does

  Rule: R3 · A driven refine never decides a business question itself

    Scenario: E5 · an unanswered question leaves the story at the gate
      Given the driven paragraph
      Then it says the question is marked "asked" before the call
      And it says a business question is never given a default in a driven session
      And it says a discovery question is never sent as the NEEDS_INPUT sentinel
      And it says a question parked unanswered leaves the story at the Contract gate with no "tasks/" written

    Scenario: the answer is written into the map and the doctor is asked again
      Given the driven paragraph
      Then it says the answer arrives as the next input of the resumed session
      And it says the session writes the answer into the map as "answered" with "stated Q<n>" or "confirmed"
      And it says the session then runs "aof work doctor <story> --json"

    Scenario: E6 · a technical question keeps its documented default
      Given the driven paragraph
      Then it says a technical question still takes its documented default

    Scenario: the driven paragraph runs only when the examples gate is on
      Given the source "packages/core/assets/commands/refine.md"
      Then the driven paragraph sits inside the discovery passage that runs only when "work.examples.enabled" is true
