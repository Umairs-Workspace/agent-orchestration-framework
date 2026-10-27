@manual @ui @work @design
Feature: The panel, the canvas ask and a proposal are seen against the committed mocks

  WHY. 171 shipped its conversation surfaces with no committed mocks, so their conformance was
  INCONCLUSIVE (171 OUTCOME). The operator accepted the drafted mocks at refine (172/01 Q2); they are
  now the design's source of truth. The developer renders the editor in a real browser at DESIGN's two
  breakpoints and reads each screenshot against its mock and its surface's binding checklist,
  recording the reading in VERIFICATION.

  Background:
    Given the browser smoke serves "ADR-003-push-stream.excalidraw" with three notes, one answered and one waiting

  Rule: R1 · Every note on the diagram is a thread in the panel

    Scenario Outline: each surface is read against its mock
      When the developer renders <surface> at <width> px
      Then the screenshot is read against "<mock>" and DESIGN's checklist for that surface
      And the reading, with any gap it names, is recorded in VERIFICATION

      Examples:
        | surface                                   | width | mock                                     |
        | the panel with an answered thread open    | 1280  | mocks/conversation-ask.png               |
        | the panel as a drawer                     | 768   | mocks/conversation-streaming-768.png     |
        | the canvas ask open on "Events route"     | 1280  | mocks/conversation-ask.png               |
        | a pending proposal in its thread          | 1280  | mocks/conversation-proposal.png          |

    Scenario: the console's colours hold inside the SDK's container
      When the developer reads the computed colour of an answered pin and of the open thread's border
      Then both are the console's primary teal, not the SDK's purple
