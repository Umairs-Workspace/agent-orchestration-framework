// Core assembly: construct once per application; collaborators are supplied explicitly.
import { createAcceptorStore } from "@aof/work/acceptor/store";

export function assembleWorkAcceptorStore({ workAcceptorCriterionServices }) {
  // Application composition for the work-owned acceptor service.

  const { LEDGER_RELPATH } = workAcceptorCriterionServices;

  const {
    CONFIG_NOT_AN_OBJECT,
    CONFIG_RELPATH,
    KNOB_KEY_UNREADABLE,
    KNOB_PATH_NOT_A_SECTION,
    KNOB_VALUE_NOT_SCALAR,
    LEDGER_LINE_CONFLICT,
    LEDGER_LINE_KEY,
    LEDGER_LINE_UNREADABLE,
    PROJECT_DIR_UNSET,
    RULING_UNIDENTIFIED,
    STORE_REFUSALS,
    StoreError,
    appendRuling,
    configPathFor,
    ledgerLine,
    ledgerPath,
    readKnobValue,
    readLedger,
    requireProjectDir,
    setKnobValue,
    writeKnobValue,
  } = createAcceptorStore({ LEDGER_RELPATH });

  return { CONFIG_NOT_AN_OBJECT, CONFIG_RELPATH, KNOB_KEY_UNREADABLE, KNOB_PATH_NOT_A_SECTION, KNOB_VALUE_NOT_SCALAR, LEDGER_LINE_CONFLICT, LEDGER_LINE_KEY, LEDGER_LINE_UNREADABLE, PROJECT_DIR_UNSET, RULING_UNIDENTIFIED, STORE_REFUSALS, StoreError, appendRuling, configPathFor, ledgerLine, ledgerPath, readKnobValue, readLedger, requireProjectDir, setKnobValue, writeKnobValue };
}
