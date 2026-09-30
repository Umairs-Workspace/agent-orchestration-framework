// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createAcceptorCriterion } from "@aof/work/acceptor/criterion";
import { bundledFrozenSet, readFrozenSet } from "../../../frozen-set.mjs";

export function assembleWorkAcceptorCriterion({  } = {}) {
  // Application composition for the work-owned acceptor service.

  const {
    ACCEPTOR_EPOCH_CADENCE,
    ACCEPTOR_EPOCH_SPAN,
    CRITERION_BUDGET_BELOW_PAIR_COUNT,
    CRITERION_FROZEN_IN_EPOCH,
    CRITERION_INCOMPLETE,
    CRITERION_PAIR_COUNT_DERIVED,
    CRITERION_RELPATH,
    CRITERION_REVISION_NOT_OPERATOR,
    CriterionError,
    EPOCH_SPAN_NOT_REQUESTABLE,
    FROZEN_CRITERION_KEYS,
    FROZEN_CRITERION_MEMBERS,
    LEDGER_RELPATH,
    REVISING_ACTOR,
    accrualReport,
    criterionDifference,
    criterionDigest,
    criterionRevisionWindow,
    defaultCriterion,
    digestValue,
    epochFor,
    makeCriterion,
    pairCountFor,
    readCriterion,
    reviseCriterion,
    rulingsUnderCurrentCriterion,
    writeCriterion,
  } = createAcceptorCriterion({ bundledFrozenSet, readFrozenSet });

  return { ACCEPTOR_EPOCH_CADENCE, ACCEPTOR_EPOCH_SPAN, CRITERION_BUDGET_BELOW_PAIR_COUNT, CRITERION_FROZEN_IN_EPOCH, CRITERION_INCOMPLETE, CRITERION_PAIR_COUNT_DERIVED, CRITERION_RELPATH, CRITERION_REVISION_NOT_OPERATOR, CriterionError, EPOCH_SPAN_NOT_REQUESTABLE, FROZEN_CRITERION_KEYS, FROZEN_CRITERION_MEMBERS, LEDGER_RELPATH, REVISING_ACTOR, accrualReport, criterionDifference, criterionDigest, criterionRevisionWindow, defaultCriterion, digestValue, epochFor, makeCriterion, pairCountFor, readCriterion, reviseCriterion, rulingsUnderCurrentCriterion, writeCriterion };
}
