# Security policy

## Reporting a vulnerability

Please report security issues **privately**. Do not open a public issue, pull request or discussion.

Use GitHub's private vulnerability reporting: on this repository, open the **Security** tab and choose
**Report a vulnerability**. The report is visible only to the maintainers. We will reply there,
agree a fix and a disclosure date with you, and credit you in the advisory if you would like.

Please include:

- what is affected: the command, module or file, and the aof version (`aof --version`)
- how to reproduce it, as the smallest steps you can
- what an attacker gains, such as reading a secret, running code, or acting as another node or user

We aim to acknowledge a report within **5 working days**, and to agree a plan within **15 working days**.

## Supported versions

aof is pre-1.0. Fixes land on `main` and ship in the next release. Only the latest release and `main`
receive security fixes.

## Scope

In scope are the aof CLI, its mesh daemons, the board and fleet UIs, the Discord bot, and the
desktop app in this repository. We especially want to hear about:

- **credentials**: a bot token, clone credential or enrollment secret that reaches argv, a log, a
  run record, a board response or a committed file
- **the answer and command paths**: anyone other than an allowlisted user answering a session's
  question or running a `/loop` command through the Discord bot; any write to the board from a
  non-loopback origin
- **the mesh**: a node acting as another node, or a worker reaching work or credentials it was
  not issued
- **supply chain**: a dependency, install script or release artefact that runs code it should not

Out of scope: issues in third-party services themselves (GitHub, Discord, Anthropic), and denial of
service against a machine you already control.

## Handling secrets in reports

Never paste a real token, key or credential into a report. Describe where it appeared, and rotate it.
