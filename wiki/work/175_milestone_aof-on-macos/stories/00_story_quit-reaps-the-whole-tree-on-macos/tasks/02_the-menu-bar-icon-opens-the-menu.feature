@manual @ui @work @design
Feature: The menu-bar icon opens the menu

  WHY. The operator chose the Mac convention on 2026-10-28 (175/00 Q2): on a Mac the status item
  opens its menu on a left-click, and the window is one item away. Windows keeps its
  left-click-shows-window behaviour. DESIGN.md's Surface M1 checklist is the baseline the
  render is judged against.

  Background:
    Given the app running on a Mac with a GUI login

  Rule: R4 · The menu-bar icon is the way in

    Scenario: E8 · a left-click opens the menu, and Show window opens the window
      When the menu-bar icon is left-clicked
      Then the menu opens, holding m36 Surface 2's regions in order: header, process controls, Open web UI, Show / Hide window, a separator, Quit
      And choosing "Show window" opens the window

    Scenario Outline: the icon reads on both menu bars, in every state
      Given the macOS appearance is "<appearance>"
      And the fleet state is "<state>"
      Then the menu-bar icon shows the "<state>" glyph, legible against the bar

      Examples:
        | appearance | state    |
        | light      | healthy  |
        | dark       | healthy  |
        | dark       | degraded |
        | light      | stopped  |

    Scenario: the menu header tracks the fleet
      Given this laptop is a single-node mesh with its one node online
      When the menu is opened
      Then its header reads "1 online"

    Scenario: Windows still shows the window on a left-click
      Given the app running on the Windows control node
      When the tray icon is left-clicked
      Then the window shows, and the menu opens only on a right-click
