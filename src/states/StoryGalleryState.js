import { storyConfig } from '../config/storyConfig.js';
import { storyTexts } from '../config/storyTexts.js';
import { texts } from '../config/uiConfig.js';
import { resolveDialogue } from '../modes/story/dialogue.js';
import { StoryEntryKind, buildStoryGallery } from '../modes/story/storyGallery.js';
import { formatText } from '../ui/formatText.js';
import { ListScreenState } from './ListScreenState.js';
import { StateId } from './stateIds.js';
import { getCharacterNames } from './StoryState.js';

function getEntryTexts(entry) {
  return entry.kind === StoryEntryKind.ENCOUNTER ? storyTexts.encounters[entry.id] : storyTexts.endings[entry.id];
}

function getEntryLines(entry) {
  const entryTexts = getEntryTexts(entry);
  return entry.kind === StoryEntryKind.ENCOUNTER ? [...entryTexts.before, ...entryTexts.after] : entryTexts.lines;
}

function describeEntry(entry) {
  const gallery = texts.storyGallery;
  if (!entry.witness) {
    const hint = entry.kind === StoryEntryKind.ENCOUNTER ? gallery.lockedEncounter : gallery.lockedEnding;
    return { label: gallery.locked, locked: true, detail: { name: gallery.locked, lines: [hint] } };
  }
  const title = getEntryTexts(entry).title;
  const label = entry.kind === StoryEntryKind.ENCOUNTER ? title : formatText(gallery.endingLabel, { title });
  return {
    label,
    locked: false,
    detail: {
      name: title,
      lines: [
        formatText(gallery.witness, { name: entry.witness.name, alignment: texts.story.alignments[entry.witness.alignment] }),
        entry.arena ? formatText(gallery.arena, { arena: texts.arenas[entry.arena] }) : '',
      ].filter(Boolean),
      accent: gallery.replay,
    },
  };
}

export class StoryGalleryState extends ListScreenState {
  getTitle() {
    return texts.storyGallery.title;
  }

  buildItems() {
    const entries = buildStoryGallery(storyConfig, this.game.settings.storySeen, this.game.story);
    return entries.map((entry) => ({ id: `${entry.kind}:${entry.id}`, entry, ...describeEntry(entry) }));
  }

  confirmItem(item) {
    const { entry } = item;
    this.game.changeState(StateId.DIALOGUE, {
      lines: resolveDialogue(getEntryLines(entry), entry.witness, getCharacterNames()),
      title: getEntryTexts(entry).title,
      arena: entry.arena,
      next: { state: StateId.STORY_GALLERY, params: {} },
    });
  }
}
