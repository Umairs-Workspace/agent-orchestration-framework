// THE RECURRENCE DECISION — milestone 153 / story 02 / ADR-002.
//
// "Is this new lesson an earlier one again?" is answered HERE, by a deterministic text-similarity
// score that is separate from retrieval ranking. Retrieval (BM25-lite, corpus-relative) decides which
// lessons are worth looking at; it is not a probability and its score means nothing across queries.
// This module scores each retrieved lesson against the new lesson's text on a fixed scale and applies
// a strict threshold chosen from labelled pairs (`test/arch/memory/fixtures/recurrence-pairs.json`,
// held by FF-15302).
//
// THE SCORE is the cosine of two term vectors. A vector holds a lesson's stemmed content words and
// its adjacent word pairs, each weighted by how often the lesson uses it and by a FROZEN inverse
// document frequency. The weights are frozen on purpose: a score that moved with the size or content
// of whatever index it was asked of could not be calibrated, and a threshold is only a measurement if
// the scale it was measured on does not drift under it. Both backends hand this module the same
// records, so both reach the same decision.
//
// WHAT IT NEVER DOES: read a disk, open an index, rank, or edit a lesson. Pure.

// Bump when the rule, the weights or the threshold change; the labelled fixture is re-measured then.
export const RECURRENCE_CALIBRATION = Object.freeze({
  version: "153.02-1",
  rule: "tf-idf cosine over stemmed words and adjacent word pairs, frozen idf, strict greater-than",
  // Chosen at build from the labelled pairs: above every training negative, below the named pair.
  threshold: 0.23,
});

// How many lessons the frozen document frequencies were counted over (2026-10-10, every
// RETROSPECTIVE.md in the stream with a body worth indexing).
const FROZEN_LESSON_COUNT = 684;

// `feature:lessons-using-it`, for every feature found in at least eight lessons. A feature below
// that floor is rare, and counts as used by one lesson: a distinctive word is the evidence.
const FROZEN_TABLE =
  "001:15 002:26 003:26 004:30 005:28 006:15 007:8 008:14 119:20 11903:9 124:11 126:20 127:19 129:15 130:10 134:8 " +
  "135:8 142:14 2026:24 4182:8 above:11 absence:13 absent:26 accept:105 accept_gate:13 acceptance:27 acd:74 " +
  "acd_source:16 across:67 act:20 actual:18 actually:37 add:120 add_file:11 address:9 admission:13 admit:8 " +
  "adr:173 adr_001:15 adr_002:26 adr_003:25 adr_004:28 adr_005:27 adr_006:14 adr_007:8 adr_008:14 agent:50 " +
  "agent_run:8 agre:9 agree:8 allow:12 alone:32 already:109 alternative:12 alway:21 amend:12 amendment:13 " +
  "anchor:15 another:62 another_milestone:11 answer:79 anyone:10 anyth:28 aof:156 aof_aof:10 aof_continue:9 " +
  "aof_mesh:9 aof_verify:11 aof_work:72 apart:11 api:18 app:9 appear:26 append:11 appli:25 apply:9 arch:71 " +
  "arch_test:33 architect:16 architecture:42 archive:13 argu:8 argument:21 argv:15 arm:12 around:18 array:17 " +
  "arriv:10 artefact:10 artifact:30 ask:58 ask_whether:8 assert:112 assertion:65 asset:13 assum:21 assumption:10 " +
  "attempt:12 attribut:15 audit:24 author:76 authority:8 autonomou:11 away:12 axi:9 back:30 backend:8 backlog:9 " +
  "bare:16 baseline:15 bear:22 beat:15 became:9 becom:20 behaviour:41 behavioural:25 behind:12 believ:11 " +
  "belong:36 below:10 beside:26 better:9 bijection:8 binary:13 bind:20 blast:15 blast_radiu:15 blind:25 block:46 " +
  "blocker:29 board:24 body:8 bound:36 boundary:26 box:10 branch:28 break:24 brief:21 broke:14 broken:10 " +
  "budget:58 budget_row:15 budget_table:8 bug:16 build:188 build_time:8 built:67 bundle:46 byt:19 byte:27 " +
  "byte_identical:8 cache:15 call:73 call_sit:8 call_site:11 caller:20 came:10 cap:9 capability:15 captur:13 " +
  "capture:10 carri:102 carry:54 cas:29 cascade:8 case:57 catch:45 caught:51 caus:12 cause:18 ceil:38 censu:36 " +
  "chain:8 chang:84 change:75 character:14 cheap:27 cheaper:11 cheapest:8 check:160 checklist:10 checkout:24 " +
  "child:24 choice:12 chore:16 cit:36 citation:22 cite:9 claim:89 class:44 classifi:8 claude:19 clause:21 " +
  "clean:27 clear:14 cli:35 clock:18 clone:9 clos:40 close:33 cod:15 code:88 collaps:8 collision:8 column:12 " +
  "command:126 command_core:9 comment:34 commit:45 committ:23 compar:8 complet:9 complete:15 component:9 compos:9 " +
  "composition:9 concurrency:8 concurrent:16 condition:14 config:23 confirm:31 conflict:9 constant:18 " +
  "constraint:12 construction:18 consum:23 consumer:19 contain:25 content:23 continue:21 contract:134 " +
  "contract_nam:9 contradict:12 control:177 control_assert:11 control_node:11 control_pin:11 control_read:9 " +
  "control_red:10 convention:12 copi:21 copy:29 core:25 corpu:11 correct:57 correction:8 correctly:26 cost:58 " +
  "count:92 coupl:8 cover:27 coverage:18 creat:18 create:14 criteria:9 cross:39 cross_milestone:8 current:14 " +
  "cut:17 cycle:12 daemon:15 dat:11 data:25 date:11 day:25 dead:17 debt:15 decid:23 decide:11 decision:51 " +
  "declar:86 declaration:27 declare:13 default:36 defect:64 deferr:29 defin:9 degrad:9 delet:15 delete:8 " +
  "deliberate:10 deliberately:24 deliver:44 deliverable:12 delta:9 demand:8 depend:25 dependency:14 dependent:8 " +
  "deploy:13 deriv:55 derive:20 describ:16 design:75 designer:8 desktop:12 detect:8 detector:14 developer:26 " +
  "diff:28 different:47 digest:11 dir:8 direction:12 directly:13 directory:49 directory_budget:21 disagree:12 " +
  "discharg:12 discharge:12 discipline:10 discover:25 disk:25 dispatch:18 distinguish:25 doc:30 doctor:35 " +
  "document:58 doesn:14 doing:8 don:12 door:42 down:26 downstream:10 drawn:8 drift:32 driv:21 drive:41 driven:20 " +
  "driver:33 drop:18 dropp:24 drove:8 duplicat:10 duplicate:11 durable:8 earlier:15 earn:8 edge:24 edit:77 " +
  "eight:12 either:40 else:14 elsewhere:10 emit:21 emitt:8 empty:31 encod:9 end:43 end_end:12 enforc:19 engine:18 " +
  "entire:9 entirely:10 entri:10 entry:42 enumerat:18 enumerate:24 enumeration:8 envelope:8 environment:15 " +
  "equal:11 error:31 establish:14 event:12 ever:16 every:267 every_control:10 every_gate:9 every_lane:9 " +
  "every_story:15 every_suite:9 every_test:8 everyth:13 evidence:60 exact:32 exactly:104 exampl:20 example:10 " +
  "execut:18 executable:31 executable_suite:10 execution:13 exercis:20 exercise:10 exist:138 exit:30 exit_code:11 " +
  "expect:41 explicit:19 explicitly:18 export:33 extend:18 external:9 extract:10 extraction:9 extractor:8 fac:8 " +
  "face:11 fact:38 fail:81 failur:18 failure:50 failure_mode:8 fall:9 fallback:12 false:31 family:22 fan:10 " +
  "feasibility:8 feature:39 feedback:17 fetch:8 field:20 fifth:8 figure:8 fil:123 file:151 file_budget:8 filter:8 " +
  "final:8 find:117 finding:22 finish:17 fir:20 fire:8 first:139 fit:10 fitness:73 fitness_function:49 five:62 " +
  "fix:137 fixtur:27 fixture:68 flag:24 flagg:19 flat:8 fleet:23 flight:14 floor:18 focus:12 fold:10 folder:15 " +
  "follow:37 forbid:27 forc:18 force:13 form:44 forward:14 found:79 four:95 four_stori:8 fourth:17 fram:21 " +
  "frame:11 free:12 freez:9 freeze:8 fresh:14 front:14 frontmatter:16 froze:8 frozen:36 full:38 full_suite:15 " +
  "fully:10 function:68 function_assert:9 future:17 gain:19 gap:73 gat:30 gate:180 gate_read:8 gate_run:8 gave:11 " +
  "general:10 generalis:8 generat:8 genuine:11 genuinely:18 get:15 git:50 giv:9 give:9 given:17 global:10 goe:16 " +
  "gone:9 grade:10 grammar:8 graph:35 graphify:15 green:149 green_executable:9 green_suite:14 grep:59 grep_test:8 " +
  "grew:9 ground:10 group:9 guarantee:15 guard:61 half:29 halt:8 hand:73 hand_back:8 hand_edit:8 handl:9 " +
  "happen:30 hard:11 harness:18 hash:16 hav:9 hazard:10 head:20 header:17 headroom:14 heartbeat:9 held:44 " +
  "helper:9 hid:8 hide:8 history:13 hit:17 hold:59 home:41 honest:34 honestly:8 honour:10 hook:11 host:16 hour:20 " +
  "human:22 identical:25 identity:19 ids:9 ignor:8 immediately:8 impact:13 implement:11 implementation:26 " +
  "import:78 import_graph:9 importer:21 importer_sweep:10 includ:17 include:8 incomplete:8 independent:17 " +
  "index:19 information:8 inherit:39 init:8 inject:17 inline:9 input:38 insert:8 inside:63 install:28 instance:15 " +
  "instead:51 instrument:32 integration:10 intend:9 intent:17 introduc:12 invalidat:8 invariant:47 invisible:28 " +
  "invocation:11 isolat:13 isolation:14 item:89 itself:60 job:10 join:25 json:47 judg:8 keep:48 kept:12 key:57 " +
  "kill:12 kind:19 know:9 known:25 label:10 lan:33 land:83 lane:143 last:23 latent:12 later:54 launch:13 layer:23 " +
  "layout:13 leaf:10 least:10 leav:29 leave:8 ledger:27 left:56 leg:47 legitimate:8 lesson:31 level:41 like:26 " +
  "lin:37 line:88 line_number:8 link:19 list:92 literal:40 liv:28 live:104 live_run:14 load:37 load_bear:16 " +
  "loader:8 local:20 location:8 lock:30 log:12 long:10 longer:9 look:49 look_like:14 loop:116 loop_mjs:11 " +
  "loop_record:8 lost:12 loud:10 m124:19 machine:32 made:52 main:18 mak:47 make:33 malform:8 manifest:16 " +
  "manual:36 manual_lane:10 map:20 mark:13 marker:9 mask:8 match:37 matter:14 mean:25 meant:8 measur:94 " +
  "measure:16 measurement:51 mechanical:11 mechanism:23 meet:11 member:23 membership:9 memory:31 merely:10 " +
  "merg:11 merge:18 mesh:51 message:22 met:15 mid:21 mileston:28 milestone:230 milestone_accept:8 " +
  "milestone_gate:21 milestone_story:9 mint:27 minut:20 mirror:11 miss:72 mjs:176 mjs_import:8 mode:14 model:23 " +
  "modul:29 module:72 moment:31 mov:87 move:49 mutation:15 nam:201 name:111 narrow:19 narrower:10 native:13 " +
  "need:111 negative:8 neither:43 never:223 never_reach:8 never_read:11 next:76 next_milestone:9 nine:17 " +
  "nobody:42 nod:12 node:65 node_script:10 non:51 non_vacuity:9 none:35 not:14 note:31 noth:171 notic:13 npm:10 " +
  "null:22 number:52 object:8 objective:8 obligation:14 observ:16 observability:15 observability_snapshot:9 " +
  "observable:10 observe:20 obviou:12 offer:9 old:26 once:56 one:15 onto:10 open:49 operator:63 option:11 " +
  "orchestrator:9 order:29 otherwise:22 outcome:35 output:32 outside:44 overlap:9 override:9 owe:12 owed:8 own:42 " +
  "owner:24 ownership:8 packag:15 package:9 page:10 paid:12 pair:11 parallel:11 parent:13 park:9 pars:17 parse:11 " +
  "parser:14 part:19 partition:18 pass:127 past:15 path:146 pattern:15 pay:16 payload:13 pend:9 perform:14 " +
  "persist:8 person:9 phase:13 pick:9 pin:73 pinn:41 plac:10 place:29 placeholder:8 plan:28 plann:12 plant:15 " +
  "platform:9 plu:32 point:51 policy:9 port:11 positive:9 post:9 pre:33 pre_exist:8 precisely:16 precondition:10 " +
  "predicate:13 predict:9 prefer:8 prefix:8 presence:14 present:12 preserv:10 primary:10 print:8 prior:9 prob:15 " +
  "probe:46 process:29 produc:48 produce:15 producer:25 product:11 production:18 progress:11 project:15 " +
  "projection:9 promis:12 promise:10 promote:10 prompt:14 proof:19 property:45 prose:47 protect:9 protocol:8 " +
  "prov:56 prov_noth:9 prove:20 proven:12 provenance:11 provider:9 pty:8 public:8 publish:10 pure:14 push:9 " +
  "put:24 query:9 question:47 quot:10 radiu:15 rais:22 raise:8 ran:63 ratchet:29 rather:177 ratifi:8 reach:90 " +
  "reachable:13 read:271 read_control:8 read_real:8 read_record:9 read_source:8 reader:52 real:131 reason:70 " +
  "rebuild:8 recall:13 reclaim:10 reconcile:9 record:195 record_doc:8 recoverable:9 recovery:13 recurr:12 red:128 " +
  "red_probe:18 redden:11 ref:132 ref_adr:8 ref_find:25 ref_m124:17 ref_state:10 reference:8 refin:10 refine:121 " +
  "refus:46 refusal:31 refuse:12 regex:11 region:10 register:56 registration:14 registry:35 regression:31 " +
  "reject:11 relay:12 remedy:14 remember:8 remote:8 remov:21 rename:10 render:54 renderer:8 repair:43 replac:14 " +
  "repo:37 report:90 repository:26 reproduc:13 request:10 requir:39 research:9 resolution:13 resolv:46 resolve:20 " +
  "resolver:16 rest:18 restart:13 restat:14 restor:10 result:28 resume:13 retain:8 retrospective:15 retry:8 " +
  "return:38 reus:12 review:119 reviewer:20 right:53 root:35 round:15 rout:34 route:36 row:117 rul:44 rule:86 " +
  "run:257 run_every:11 run_record:27 run_story:9 run_test:11 runn:45 runner:29 runtime:29 safe:13 said:41 sat:21 " +
  "satisfi:12 satisfy:14 say:87 scaffold:12 scan:19 scenario:82 scenario_assert:8 schedul:11 schema:14 scop:39 " +
  "scope:58 scope_impact:10 script:44 script_test:27 seam:60 search:10 second:88 section:16 see:46 seed:9 " +
  "select:9 self:25 semantic:8 sentence:16 separat:8 separate:20 separately:10 serv:10 session:69 set:109 settl:8 " +
  "settle:11 seven:17 several:10 shap:29 shape:111 shar:59 share:9 shell:40 ship:26 shipp:62 short:11 show:26 " +
  "shrink:12 sibl:35 side:16 signal:27 signature:10 silent:35 silently:69 since:18 single:43 sit:24 site:29 " +
  "six:38 sixth:10 size:15 skip:10 skipp:9 slice:10 slug:9 small:12 snapshot:23 someone:17 someth:17 sound:9 " +
  "source:103 source_directory:17 span:10 spawn:35 spec:23 speci:19 specifi:13 specific:15 spell:37 spend:11 " +
  "split:25 src:111 src_bundle:14 src_command:17 src_work:24 stag:8 stage:11 stale:49 stall:11 stamp:12 stand:28 " +
  "start:35 stat:60 state:97 state_feedback:13 statement:8 static:11 statu:53 stay:41 stay_green:13 step:35 " +
  "stop:25 stopp:15 stor:14 store:27 stori:64 story:297 story_add:28 story_chang:16 story_declar:10 story_edit:8 " +
  "story_fil:14 story_lane:21 story_scop:16 story_task:8 story_touch:10 str:22 stream:34 structural:35 " +
  "structurally:19 subject:53 success:8 suit:52 suite:132 suite_green:8 supersed:9 suppli:11 supply:8 support:13 " +
  "surfac:42 surface:64 surviv:16 sweep:53 swept:8 symbol:9 sync:21 system:15 table:49 tak:20 take:8 taken:30 " +
  "target:27 task:84 tech:9 tech_debt:9 tell:24 temp:10 template:11 ten:11 term:13 terminal:17 terminator:8 " +
  "test:245 test_acd:9 test_arch:29 test_assert:13 test_fil:10 test_green:8 test_loop:9 test_mjs:49 test_prov:8 " +
  "test_support:10 text:44 therefore:11 thesi:12 thing:51 third:28 though:8 three:157 three_control:8 three_tim:8 " +
  "threshold:10 through:80 throughout:11 tick:9 tim:33 time:65 timeout:8 title:11 today:13 together:8 token:22 " +
  "took:21 tool:29 top:21 top_level:10 touch:55 track:15 trade:9 transcript:10 transition:8 transport:11 trap:9 " +
  "treat:48 tree:121 tree_gate:13 triage:11 trigger:12 trip:18 tripp:8 true:38 trust:18 tsx:9 turn:34 twice:33 " +
  "typ:9 type:16 uat:24 unattribut:9 unchang:14 uncommitt:9 unit:9 unknown:13 unreachable:12 untouch:10 untrack:9 " +
  "url:8 use:15 user:12 vacuity:12 validate:29 valu:9 value:43 verb:42 verbatim:12 verdict:16 verifi:19 " +
  "verification:32 verify:106 version:14 view:10 visible:14 vocabulary:15 wait:15 walk:31 wall:13 wall_clock:9 " +
  "want:13 warn:14 watch:11 wave:23 way:31 well:14 went:37 went_red:12 whatever:15 whether:34 whole:110 " +
  "whole_suite:9 whole_tree:28 wide:16 widen:37 width:11 wiki:13 wiki_work:12 window:40 wir:22 wire:9 within:17 " +
  "without:76 word:28 work:225 work_doctor:17 work_loop:21 work_memory:8 work_mjs:11 work_observe:13 " +
  "work_stream:8 work_tree:9 work_validate:8 worker:18 workspace:20 worktree:28 worse:13 worth:29 writ:56 " +
  "write:99 write_set:36 writer:18 written:115 wrong:76 wrote:26 yield:13 zero:45";

const FROZEN_DOCUMENT_FREQUENCY = new Map(
  FROZEN_TABLE.split(" ").map((entry) => {
    const cut = entry.lastIndexOf(":");
    return [entry.slice(0, cut), Number(entry.slice(cut + 1))];
  }),
);

const STOPWORDS = new Set(
  "the and for that this with from not but are was were has have had its into over than then them they their there which when what where while will would should could can cannot been being also only any all each both more most such out one two per via use used using does did done how why who whose too very just still even about after before again against because between during under until own same other some those these here our your you his her she him let may might must shall off nor yet new now get got".split(" "),
);

// A light suffix strip, not a linguistic stemmer: enough that `junction` and `junctions`, `deleted` and
// `deletes` meet, and nothing cleverer, so the rule stays explainable.
function stem(word) {
  if (word.length > 5 && word.endsWith("ing")) return word.slice(0, -3);
  if (word.length > 4 && word.endsWith("ed")) return word.slice(0, -2);
  if (word.length > 4 && word.endsWith("es")) return word.slice(0, -2);
  if (word.length > 3 && word.endsWith("s") && !word.endsWith("ss")) return word.slice(0, -1);
  return word;
}

// text → Map(feature → count), in first-seen order (the order the sums run in, so the score is the
// same on every machine).
export function lessonFeatures(text) {
  const words = (String(text ?? "").toLowerCase().match(/[a-z0-9]+/g) ?? [])
    .filter((word) => word.length >= 3 && !STOPWORDS.has(word))
    .map(stem);
  const features = new Map();
  const add = (feature) => features.set(feature, (features.get(feature) ?? 0) + 1);
  for (const word of words) add(word);
  for (let i = 0; i + 1 < words.length; i += 1) add(`${words[i]}_${words[i + 1]}`);
  return features;
}

const weightOf = (feature) => Math.log((FROZEN_LESSON_COUNT + 1) / ((FROZEN_DOCUMENT_FREQUENCY.get(feature) ?? 1) + 1));

function vectorOf(text) {
  const vector = new Map();
  let squares = 0;
  for (const [feature, count] of lessonFeatures(text)) {
    const weight = count * weightOf(feature);
    vector.set(feature, weight);
    squares += weight * weight;
  }
  return { vector, norm: Math.sqrt(squares) };
}

const round6 = (value) => Math.round(value * 1e6) / 1e6;

// The similarity of two lesson texts, 0..1, rounded to six places so the number printed is the number
// compared. Empty text on either side is 0.
export function recurrenceScore(textA, textB) {
  const a = vectorOf(textA);
  const b = vectorOf(textB);
  if (a.norm === 0 || b.norm === 0) return 0;
  let dot = 0;
  for (const [feature, weight] of a.vector) {
    const other = b.vector.get(feature);
    if (other !== undefined) dot += weight * other;
  }
  return round6(dot / (a.norm * b.norm));
}

// A lesson record's canonical reference: `<item>/R<n>`, the form `Recurs` carries (a story's lessons
// are `<milestone>/<story>/R<n>`).
export const lessonRef = (record) => `${record.item}/${record.id}`;

// How many candidates a decision reports. The best of them is the only one that can qualify.
export const RECURRENCE_CANDIDATES = 3;

// text + the lesson records retrieval returned → the decision.
//   - only `lesson` records are candidates: an ADR, gap or capability never matches;
//   - `exclude` (a canonical reference) is the lesson being written, and never a candidate;
//   - candidates are ordered by score, highest first, equal scores by canonical reference;
//   - the best candidate QUALIFIES only if its score is strictly greater than the threshold — a score
//     exactly at the threshold is not evidence;
//   - the result always carries the threshold and the calibration version, so a null is explicable.
export function evaluateRecurrence({ text, records = [], exclude = null, calibration = RECURRENCE_CALIBRATION } = {}) {
  const scored = records
    .filter((record) => record?.recordType === "lesson" && lessonRef(record) !== exclude)
    .map((record) => ({
      ref: lessonRef(record),
      score: recurrenceScore(text, record.text),
      kind: record.kind ?? "",
      title: record.title ?? "",
      source: record.source ?? "",
    }))
    .sort((a, b) => b.score - a.score || (a.ref < b.ref ? -1 : a.ref > b.ref ? 1 : 0));
  const candidates = scored.slice(0, RECURRENCE_CANDIDATES);
  const best = candidates[0] ?? null;
  return {
    qualifying: best !== null && best.score > calibration.threshold ? best.ref : null,
    score: best?.score ?? null,
    threshold: calibration.threshold,
    calibration: calibration.version,
    candidates,
  };
}
