@executable @cli @work @distribution
Feature: the node record declares the machine hostname, and the fabric joins on it rather than on the id's spelling

  WHY THE JOIN IS PART OF THIS STORY. `resolvePeers` (`src/mesh/fabric.mjs`) matches a fabric peer
  to an aof node by building a `byHost` index over the roster and looking up the peer's
  `HostName`, then its `DNSName` leading label. The index today is seeded from TWO sources:
  `byHost.set(nodeId.toLowerCase(), nodeId)` — the id read AS IF it were a machine name — and
  `byHost.set(host.toLowerCase(), nodeId)` when the record carries one. The first seed is the
  reason `sanitizeHostname` strips the macOS mDNS `.local` suffix at all (F-3302, milestone 33:
  without it the derived id was `umamis-mac-mini-local`, Tailscale reported `umamis-mac-mini`, and
  the Mac stayed UNJOINED — "see every node" broke for macOS).

  So task 00 removes the very thing that seed matches on. An opaque `node-<hash>` matches no
  `HostName` anywhere, and the second seed does not cover for it: `host` is the ADVERTISED DIAL
  ADDRESS, not the machine name — `identity.mjs` sets it to the `--address` override when one is
  pinned, and on the control node `aof mesh identity --json` answers `host: "192.168.1.102"`. With
  an opaque id and a pinned address, the roster would carry no key Tailscale's `HostName` could
  match, and the fleet would go blind in exactly the way F-3302 documents.

  THE RULING. The node record gains `hostname` as an ADDITIVE key — the machine's real name,
  distinct from `host` (the dial address) — and `resolvePeers` seeds `byHost` from it. This is the
  additive-key discipline the presence record already uses for `sessions` (milestone 38/ADR-001)
  and `loops` (130/ADR-005 §1): existing keys keep their relative order and their values, so a
  pre-132 record stays valid and a reader that does not know the key is unaffected. The disclosure
  question does not arise: node records are published into the GLOBAL store under the aof home
  (`~/.aof`, honouring `AOF_GLOBAL_HOME`), never into a checkout and never into a commit — which
  is the whole reason a machine name may live there and may not live in a run record.

  RULINGS (QA, 2026-09-22). (1) `hostname` is the raw `os.hostname()` as observed, NOT sanitized —
  the join lower-cases both sides and tolerates a trailing dot, exactly as it does today, and
  sanitizing would re-derive an identifier for no reason. (2) The key is emitted ALWAYS, defaulting
  to `""` when the caller supplies none, so the shape is stable (the `sessions` precedent, not the
  conditional `loops` one). (3) The id-as-host seed is REMOVED, not merely superseded: leaving it
  would keep a pinned name like `aof-wsl` joining by accident and hide a missing `hostname` until a
  node that pins nothing arrives. (4) A peer matching nothing still surfaces UNJOINED
  (`nodeId: null`) — never dropped, the existing contract. (5) `assembleDescriptor` stays a pure
  projection that writes nothing.

  Background:
    Given an isolated aof home `H` (a fresh `AOF_GLOBAL_HOME`) and a fixture checkout `C`
    And `src/node-identity.mjs` and `src/mesh/fabric.mjs` are imported directly

  Scenario: the descriptor carries the machine name beside the dial address
    When `assembleDescriptor({ nodeId: "node-7f3a", hostname: "192.168.1.102", machineName: "Win-Host-A", platform: "win32", runtimes: ["claude"], aofVersion: "0.1.0", now: "2026-09-22T20:57:38.739Z" })` is asked
    Then its keys deep-equal, in order, `["nodeId", "host", "hostname", "os", "runtimes", "aofVersion", "publishedAt"]`
    And `host` reads `"192.168.1.102"` and `hostname` reads `"Win-Host-A"` — the two are distinct fields
    And the `nodeId`, `host`, `os`, `runtimes`, `aofVersion` and `publishedAt` values are byte-identical to a pre-132 assembly with the same inputs
    And it wrote nothing

  Scenario Outline: the key is always present, defaulting to the honest empty string
    When `assembleDescriptor` is asked with `machineName` <given>
    Then its `hostname` reads <value>
    And the key is present — never omitted

    Examples:
      | given       | value  |
      | `"aof-wsl"` | `"aof-wsl"` |
      | omitted     | `""`   |
      | `null`      | `""`   |

  Scenario Outline: a peer joins to an opaque id through the declared hostname
    Given the roster holds one record `{ nodeId: "node-7f3a", host: "192.168.1.102", hostname: <declared> }`
    When `resolvePeers` is asked against a fabric peer whose `HostName` is <hostName> and `DNSName` is <dnsName>
    Then the peer resolves to `nodeId` <answer>

    Examples:
      | declared            | hostName            | dnsName                        | answer        |
      | `"umamis-mac-mini"` | `"umamis-mac-mini"` | `"umamis-mac-mini.tail1a2b.ts.net."` | `"node-7f3a"` |
      | `"Win-Host-A"`      | `"win-host-a"`      | `""`                           | `"node-7f3a"` |
      | `"umamis-mac-mini"` | `""`                | `"umamis-mac-mini.tail1a2b.ts.net."` | `"node-7f3a"` |
      | `"umamis-mac-mini"` | `"some-other-box"`  | `"some-other-box.tail1a2b.ts.net."` | `null`        |
      | `""`                | `"win-host-a"`      | `""`                           | `null`        |

  Scenario: the id is no longer read as if it were a machine name
    Given the roster holds one record `{ nodeId: "aof-wsl", host: "172.24.96.1", hostname: "aof-wsl-guest" }`
    When `resolvePeers` is asked against a fabric peer whose `HostName` is `"aof-wsl"`
    Then the peer resolves to `null` — the id seed is gone; only the declared `hostname` joins
    And when the same peer's `HostName` is `"aof-wsl-guest"` it resolves to `"aof-wsl"`
    And `src/mesh/fabric.mjs` contains no expression seeding the host index from a `nodeId`

  Scenario: an unjoined peer is still surfaced, never dropped
    Given the roster holds one record whose `hostname` matches no peer
    When `resolvePeers` is asked against two fabric peers, one matching and one not
    Then both peers are answered
    And the unmatched one carries `nodeId: null` and its `dialAddress`

  Scenario: a pre-132 record with no hostname key still reads, and joins by nothing rather than by its id
    Given the roster holds one record `{ nodeId: "win-host-a", host: "192.168.1.102" }` — no `hostname` key
    When `resolvePeers` is asked against a fabric peer whose `HostName` is `"win-host-a"`
    Then the peer resolves to `null`
    And no error was thrown — an absent key is benign, and the node rejoins on its next publish

  Scenario: the machine name is published to the aof home and reaches no checkout
    Given `C` is the process's working directory
    When `aof mesh identity` publishes this node's record into `H`
    Then the record under `<H>/mesh` carries `hostname` with this machine's real name
    And a recursive listing of `C` after the publish deep-equals the listing before it
    And `git ls-files` names no file carrying that record
