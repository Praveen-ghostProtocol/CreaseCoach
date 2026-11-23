# CreaseCoach project brief

**Academic title** · CreaseCoach: A Human-Centred Digital System for Cricket Performance Interpretation, Guided Reflection, and Personalized Practice Planning.

**Course** · ED5012 Advanced Applications of Human Factors, IIT Madras. The course overview gives 10 marks for the in-class quiz, 30 for homework and assignments, and 60 for the term project (PDF page 10, slide 11). The internal project split reported from class is documentation 30, presentation 15, and working app 15. The PDF’s user–work framework lists five evaluation lenses (PDF page 13, slide 14).

## Problem hypothesis

Developing batters, especially those without regular individual coaching, may struggle to recognise recurring outcomes, interpret incomplete feedback, and select a specific practice objective. A structured evidence-to-plan workflow may help with those tasks. Interviews or observations would be needed to establish the frequency and practical impact of these difficulties.

**Research question** · Does guided digital reflection help developing batters interpret batting evidence and choose better-justified practice objectives than unstructured self-review?

The app externalises recall through an innings log and timestamped notes, supports interpretation through transparent denominators and source labels, and leaves the next objective editable. Players can complete the workflow using only an innings record. Coaches or experienced teammates can review observations with the player outside the app.

## Design choices

| Approach considered | Choice and rationale |
| --- | --- |
| Free-form diary | Keep optional free text plus structured required fields, so recorded outcomes support comparison without demanding technical knowledge. |
| Automated video diagnosis | Provide manual observations, tentative interpretations and a review category. Different viewpoints and limited frames constrain what can be inferred. |
| Hardware-first feedback | Use illustrative IMU-style sequences to demonstrate interpretation. The primary workflow runs with ordinary browser input. |
| Cloud accounts | Use browser-local data to reduce setup and keep clips on-device. This leaves cross-device sync outside the prototype. |
| Broad coaching programme | Offer one editable objective and up to two activities, reducing decisions the player must hold in mind. |

The implementation uses ES modules, native forms and media APIs, WebGL and SVG. Node builds a static bundle and its offline asset list. The npm registry was inaccessible during scaffolding, and the dependency-free approach also fits the offline and classroom setup goals.
