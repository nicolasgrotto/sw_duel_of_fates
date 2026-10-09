import { formatText } from '../../ui/formatText.js';

export const Speaker = Object.freeze({
  PROTAGONIST: 'protagonist',
  NARRATOR: 'narrator',
});

function resolveSpeaker(speaker, protagonist, names) {
  if (speaker === Speaker.PROTAGONIST) {
    return protagonist.name;
  }
  return speaker === Speaker.NARRATOR ? '' : names[speaker] ?? speaker;
}

export function resolveDialogue(lines, protagonist, names) {
  return lines.map(({ speaker, text }) => ({
    speaker: resolveSpeaker(speaker, protagonist, names),
    text: formatText(typeof text === 'string' ? text : text[protagonist.alignment], { name: protagonist.name }),
  }));
}
