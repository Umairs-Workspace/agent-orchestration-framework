@docs @assets @distribution
Feature: A push publishes the site, and one workflow is the only thing that can

  `.github/workflows/` holds `release.yml` and nothing else, so this repository has no publishing
  path at all. Everything a reader would want lives where only a maintainer looks — two planning
  PRDs, seventeen registry records under `.aof/loops/`, the per-milestone ADRs of 52-63 and 68-79.
  This task builds the path; tasks 01 and 02 decide what travels it and repair what it contradicts.

  **The three questions `STORY.md` left to refine are settled here, and the reasons are load-bearing
  rather than taste.**

  **Jekyll, not a Node static build.** The PRDs are Markdown to be published roughly as-is, and
  `actions/jekyll-build-pages` renders Markdown with no new toolchain in this repository. A Node
  Markdown pipeline would be a second build surface to keep green, bought for nothing: the site has
  no interactivity to justify one.

  **`docs/` on the default branch, not a `gh-pages` branch.** A `gh-pages` branch is a second copy of
  the content whose staleness is invisible in a pull-request diff — which is the exact defect this
  story exists to fix, one level up. Site source sitting beside the change it documents is reviewed
  with it.

  **A GitHub Actions deployment, not the classic branch-and-folder Pages path.** The classic path can
  only serve committed bytes, which would force the generated graph document to be committed a second
  time under `docs/`. A workflow STAGES it at build time instead, so the site sources the one
  committed artefact and never copies it. That is what makes task 01's "projected, not copied" claim
  possible at all, so the choice is not an implementation detail.

  **The gate runs on a pull request; the deploy runs only on the default branch.** Drift caught after
  merge is drift that already shipped. Splitting the two triggers is what makes the gate preventive
  rather than a report.

  **A static lint over the checked-in YAML is what a build agent can actually assert**, and this
  repository already has the idiom — `test/bundle/release-workflow-lint.test.mjs`, comment-stripped
  and line-anchored, with no YAML parser dependency added for a lint-only concern. Its own header
  records the trap that costs an afternoon otherwise: **line endings must be normalised at the read
  boundary**, because on a CRLF checkout `/#.*$/` per split line strips nothing and the lint then
  reads the workflow's explanatory prose as configuration — red on Windows, green on Linux. That
  normalisation is a criterion below, not a convention to remember.

  @executable
  Scenario: the repository gains exactly one publishing workflow
    Given `.github/workflows/` after this change
    When its members are read
    Then `pages.yml` is present
    And `release.yml` is unchanged in claim — no leg, trigger, permission or job of it is edited
    And no third workflow is added

  @executable
  Scenario: the deploy runs only after the gate passes
    Given `.github/workflows/pages.yml`
    When its job graph is read
    Then the job that deploys declares the gate job in its `needs`
    And no job that deploys is reachable without the gate job having succeeded

  @executable
  Scenario: the gate answers on a pull request and the deploy does not
    Given `.github/workflows/pages.yml`
    When its triggers and job conditions are read
    Then the gate job runs on a pull request targeting the default branch
    And the gate job runs on a push to the default branch
    And the deploy job runs on a push to the default branch and on a manual dispatch
    And the deploy job does not run for a pull request

  @executable
  Scenario: the publishing token is scoped to the job that publishes
    Given `.github/workflows/pages.yml`
    When its permissions are read
    Then the workflow's top-level permissions grant no write scope
    And `pages: write` and `id-token: write` are granted on the deploy job alone
    And the gate job is granted `contents: read` and nothing more

  @executable
  Scenario: two pushes in quick succession do not race each other onto the site
    Given `.github/workflows/pages.yml`
    When its concurrency declaration is read
    Then the deploy job declares a concurrency group
    And an in-flight deploy is not cancelled by a newer one

  @executable
  Scenario: the site's shell is committed and its content is not
    Given the repository tree after this change
    When `docs/` is read
    Then it holds the site's configuration, its layout and its landing page
    And it holds no page whose bytes are produced by a build step
    And the directory the build stages into is ignored by git

  @executable
  Scenario Outline: the lint reads configuration, never the workflow's own prose
    Given `.github/workflows/pages.yml` read through the lint's own read boundary
    When a <line kind> containing the token `<token>` is present
    Then the lint <verdict>

    Examples:
      | line kind                  | token           | verdict                              |
      | configuration line         | needs           | reads it as configuration            |
      | comment explaining a choice| needs           | does not read it as configuration    |
      | comment naming a trigger   | pull_request    | does not read it as configuration    |

  @executable
  Scenario: the lint is line-ending agnostic, so it answers the same on either checkout
    Given the workflow source read with CRLF line endings
    And the same source read with LF line endings
    When the lint runs over each
    Then the two verdicts are identical
    And every comment is stripped in both

  @executable
  Scenario: the lint is non-vacuous
    Given the lint after this change
    When it is run against a workflow with the gate job's `needs` edge removed
    Then it fails
    And the failure names the deploy job and the gate it no longer waits for

  @uat
  Scenario: the site is live and reachable
    Given the repository's Pages source has been set to GitHub Actions by the repository owner
    When the workflow has run on the default branch
    Then the site loads at the project's Pages URL
    And its landing page links every page the build published
    And no published link 404s
