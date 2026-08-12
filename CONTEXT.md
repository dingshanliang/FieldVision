# FieldVision domain language

## Base

The complete managed agricultural area shown as one continuous spatial environment. A Base contains Field Parcels, Facilities, irrigation routes, and patrol activity.

## Field Parcel

A bounded piece of farmland that can be selected and entered as a spatial object. A Field Parcel has an operational identity, planted crop, growth stage, moisture state, growth state, and one or more useful viewpoints.

## Hero Parcel

The Field Parcel used to tell the primary demonstration story. A02 is the current Hero Parcel; it receives the highest visual fidelity and participates in the risk-to-recovery sequence.

## Observation

Evidence about current field conditions, such as moisture, vegetation growth, weather, or an aerial scan. An Observation can reveal a Risk Zone but is not itself a task or a diagnosis.

## Risk Zone

A spatially bounded part of a Field Parcel whose observed state needs attention. A Risk Zone remains visible until the response has produced recovery evidence.

## Facility

A spatial asset that supports farm operations, such as a pump station, gate, weather station, or management building.

## Task Hero Asset

A Facility or mobile machine given 0–20 metre visual fidelity because it carries an Autonomous Operation Task or critical dependency through visible action, exception, and result. Model detail alone does not make an asset a Task Hero Asset.

## Smart Operations Yard

The road-accessible home area for autonomous machinery storage, charging, drone docking, positioning service, edge control, and exception maintenance. FieldVision adapts the existing northwest management station for this role instead of adding another large building.

## Support Node

A representative sensing, positioning, communications, or telemetry installation that supports farm operations without carrying its own task story. Support Nodes use restrained fidelity, repeated geometry, and chapter-dependent labels rather than competing with Task Hero Assets.

## Irrigation Response

The operational sequence that activates a pump and gate, moves water through the irrigation route, changes field moisture, and resolves the associated Risk Zone.

## Recovery

The verified state reached when field indicators return to their target range and the Risk Zone no longer needs attention. Animation completion alone does not define Recovery; the spatial state and displayed evidence must agree.

## Supervised Autonomy

The operating model in which the farm automatically senses conditions, prepares a response, executes approved actions, and verifies the result, while a remote human confirms consequential actions and handles exceptions. It does not mean a farm with no people or unrestricted machine decision-making.

## Remote Confirmation

The explicit approval by a remote duty operator that authorizes a consequential autonomous response. During autoplay the demo visibly simulates this human action; during guided presentation the presenter may perform the same confirmation manually.

## Autonomous Field Operation

A bounded farm task carried out by unmanned machinery against an assigned route and operating plan, with visible progress, completion evidence, and exception handoff. It is not unrestricted free roaming or a mixture of machines from incompatible crop seasons.

## Autonomous Operation Task

The canonical record of one supervised autonomous activity, including its target, assigned equipment, route or control plan, evidence, confirmation, progress, exception state, and result. A demonstration chapter may observe or advance a Task but is not the Task itself.

## Daily Operation Plan

The confirmed set of routine Autonomous Operation Tasks scheduled for the same operating window. A new consequential response discovered during execution, such as A02 irrigation, requires its own Remote Confirmation rather than inheriting the plan's approval.

## Confirmation Receipt

The traceable record that authorizes a consequential Autonomous Operation Task and identifies how confirmation occurred. Full autoplay visibly simulates the remote operator action, guided presentation may capture a manual action, and direct chapter restoration uses an explicitly labelled demonstration preset rather than implying a real approval.

## Presentation Pause

The presenter-controlled hold that freezes chapter time, task progress, equipment travel, and business-state transitions while low-distraction environmental motion may continue. It must not allow an Autonomous Operation Task to complete invisibly during an explanation.

## Task Exception

A condition that stops or limits the affected Autonomous Operation Task and requests remote or on-site intervention. Independent tasks continue unless they share the same unsafe area, equipment, or operational dependency.

## Canonical Chapter Snapshot

The complete, deterministic farm and task state restored when entering or replaying a demonstration chapter. It includes prerequisite receipts and task outcomes with explicit demonstration provenance, rather than restoring only the camera or visual layer.

## Operation Completion

The state reached when assigned equipment has finished its approved route or control action and returned the expected operating receipt. It does not by itself prove that the intended agronomic or maintenance outcome was achieved.

## Verified Outcome

The evidence-backed result that closes an Autonomous Operation Task after Operation Completion. Verification uses evidence appropriate to the task, such as route coverage and implement status for sowing or D1/D3 field observations for A02 irrigation.

## Confirmation Invalidation

The loss of authorization when a confirmed task's consequential target, equipment, route, operating parameters, or safety boundary changes. Presentation pacing, camera movement, and explanatory copy do not invalidate confirmation.

## Operational Dependency

A relationship through which one task or shared safety area constrains another task's ability to proceed. A Task Exception propagates only through these dependencies; unrelated tasks continue operating.
