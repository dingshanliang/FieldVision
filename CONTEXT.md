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

## Irrigation Response

The operational sequence that activates a pump and gate, moves water through the irrigation route, changes field moisture, and resolves the associated Risk Zone.

## Recovery

The verified state reached when field indicators return to their target range and the Risk Zone no longer needs attention. Animation completion alone does not define Recovery; the spatial state and displayed evidence must agree.
