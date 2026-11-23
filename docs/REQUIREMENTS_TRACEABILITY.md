# Requirements traceability

| Requirement | Human-factors rationale | App and observable demonstration | Evaluation measure | Evidence still needed |
| --- | --- | --- | --- | --- |
| Who and when | Players have different cricket vocabulary and limited time after an innings. | Log a not-out entry from four fields, then expand optional details. | Completion rate and entry time. | Field observation and participant background. |
| Where | Intermittent networking and device reach affect completion. | Use bottom navigation at 375 px and open the laptop comparison after disconnecting. | Control errors, readability and device fit. | Physical handset and outdoor tests across users. |
| Anthropometry | A body dimension needs its subject, units, landmarks and measurement provenance. | Record direct or self-reported dimensions for the profile and each clip. Estimate a projected length from a reference in a video frame and inspect its distinct label. | Source classification, repeatability, and absolute error versus a direct measure. | Consented measurements and a calibrated reference recording. [Anthropometry workflow](ANTHROPOMETRY.md) |
| What and information handling | Repeated outcomes and missing data need explicit interpretation. | Edit an innings, observe counts change, and drill down from a distribution. | Correct count and denominator, unsupported causal responses. | Comparison against unstructured review. |
| How and functional evaluation | Players need a feasible next step and review prompt. | Select evidence, edit the objective, save, complete an activity and reopen the reflection. | Task success, time and 0–3 objective score. | Participant trials and independent scoring. |
| Biomechanics | Motion descriptions need context and provenance. | Switch simulated sessions, view sample-derived timing and angular metrics, and compare the paths. | Correct description of what the model represents. | Hardware, calibrated reference, repeatability and verification. |
| Aesthetic evaluation | Clear hierarchy and legibility help players find the next action. | Review desktop split panels, mobile forms, focus indicators and source tags. | Clarity rating and navigation errors. | User perception, sunlight and assistive-technology feedback. |
| Video and uncertainty | A timestamp is inspectable, while a cause may remain uncertain. | Open a clip or schematic, capture a frame, and mark a note with its evidence type. | Task success and classification errors. | Codec and accessibility testing across devices. |
| Working PWA | The demonstration should survive loss of connectivity. | Build and serve the precached app, validate installation eligibility and reopen offline. | Successful reload and workflow completion. | Installation on target phones and browser coverage. |

Verification outcomes are recorded in [Implementation status](IMPLEMENTATION_STATUS.md). The measures in this table describe the proposed user study.
