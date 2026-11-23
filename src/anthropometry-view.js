import { bodyMeasures, dimensionSources, measureByKey, projectedLength } from './anthropometry.js';
import { markerTime } from './batting-timeline.js';
import { button, escapeHtml as e, iconButton, panelHead, tag } from './ui.js';

// CDC NHANES 2017–2018, BMX_J public-use record SEQN 93706.
const publishedDimensions = {
  stature:{cm:175.7,source:'measured'},
  upperArm:{cm:38.8,source:'measured'},
  upperLeg:{cm:46.6,source:'measured'},
};

export function dimensionValues(dimensions,emptyText = 'No body dimensions recorded.') {
  const entries=bodyMeasures.filter(({key})=>dimensions?.[key]);
  if (!entries.length) return `<p class="dimension-empty">${e(emptyText)}</p>`;
  return `<dl class="dimension-values">${entries.map(({key,label})=>{
    const {cm,source}=dimensions[key];
    return `<div><dt>${label}</dt><dd><strong>${cm} cm</strong><small>${dimensionSources[source]}</small></dd></div>`;
  }).join('')}</dl>`;
}

export function profileDimensions(profile,demo) {
  return `<section class="panel profile-dimensions">${panelHead('Player anthropometry',demo?'Illustrative profile for Arjun.':'Optional body dimensions for the player profile.',
    demo?tag('Fictional profile','gray'):button('Edit dimensions',{action:'edit-profile',glyph:'edit',variant:'outline'}))}
    ${dimensionValues(profile.dimensions,'Add measured or self-reported dimensions in the profile.')}
    ${demo?`<p class="dimension-empty">Video clips show different people. Their measurements are recorded separately.</p>
    <details class="form-details survey-example"><summary>Published body measurement example</summary>
      <p class="dimension-empty">One de-identified CDC NHANES 2017–2018 survey record. The values describe that survey participant.</p>
      ${dimensionValues(publishedDimensions)}
      <p class="dimension-empty"><a href="https://wwwn.cdc.gov/Nchs/Data/Nhanes/Public/2017/DataFiles/BMX_J.htm" target="_blank" rel="noopener noreferrer">CDC source data</a> · <a href="https://wwwn.cdc.gov/Nchs/Nhanes/Nhanes3/AnthropometricVideos.aspx" target="_blank" rel="noopener noreferrer">CDC measurement demonstration</a></p>
    </details>`:''}</section>`;
}

function projectionValues(projections,available) {
  if (!projections?.length) return '';
  return `<ul class="projection-list">${projections.map(row=>`<li><div><strong>${measureByKey(row.key).label} · ≈${projectedLength(row.knownCm,row.referencePx,row.targetPx)} cm</strong>
    <small>Projected from ${e(row.reference)} (${row.knownCm} cm)</small></div><div class="button-row compact">
    ${button(markerTime(row.time),{action:'jump-video',variant:'subtle',attrs:`data-time="${row.time}" ${available?'':'disabled'} aria-label="Jump to measurement frame at ${row.time} seconds"`})}
    ${iconButton('Remove frame estimate','trash','remove-projection',`data-id="${e(row.id)}"`)}</div></li>`).join('')}</ul>`;
}

export function clipDimensions(clip,available) {
  return `<section class="panel clip-dimensions" aria-label="Clip anthropometry">${panelHead('Clip anthropometry','Record dimensions for the person in this clip.')}
    ${dimensionValues(clip.dimensions,'Body dimensions unrecorded.')}
    ${projectionValues(clip.projections,available)}
    <div class="button-row"><button type="button" class="btn outline" data-action="edit-clip-dimensions" data-id="${e(clip.id)}">Edit dimensions</button>
    ${button('Measure on frame',{action:'measure-frame',glyph:'target',variant:'outline',attrs:available?'':'disabled'})}</div>
    <p class="dimension-empty">Frame estimates use a reference of known length in the same plane as the body dimension.</p></section>`;
}

export function compareDimensions(clip,label) {
  return `<details class="compare-dimensions"><summary>${label} anthropometry</summary>${dimensionValues(clip.dimensions,'Body dimensions unrecorded for this batter.')}
    ${(clip.projections||[]).map(row=>`<p class="dimension-empty">${measureByKey(row.key).label} · ≈${projectedLength(row.knownCm,row.referencePx,row.targetPx)} cm projected at ${markerTime(row.time)}</p>`).join('')}
    <p>${button('Edit clip dimensions',{action:'edit-clip-dimensions',variant:'outline',attrs:`data-id="${e(clip.id)}" aria-label="Edit dimensions for ${label}"`})}</p></details>`;
}
