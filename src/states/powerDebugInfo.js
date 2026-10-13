export function getPowerDebugInfo(fighter) {
  const c = fighter.combat;
  const slots = ['neutral', 'forward', 'back', 'fourth'].map(slot => slot + '=' + (fighter.stats.power?.loadout?.[slot]?.id ?? '-')).join(' ');
  return fighter.id + ' variant ' + (fighter.variant ?? '-') + ' [' + slots + '] mode ' + (c.powerMode ?? '-') + ' choke ' + c.chokeTime.toFixed(2)
    + ' sanctuary ' + c.sanctuaryShield.toFixed(1) + '/' + c.sanctuaryTime.toFixed(2) + ' wrath armor ' + c.wrathArmorHits
    + ' rain ' + (c.rain?.phase ?? '-') + '/' + (c.rain?.time ?? 0).toFixed(2) + ' marks ' + (c.rain?.marks.filter(mark => mark.active).length ?? 0)
    + ' arsenal ' + (c.arsenal?.objects.length ?? 0) + '/' + (c.arsenal?.time ?? 0).toFixed(2)
    + ' storm wave ' + c.stormNextStrike + ' fractures ' + c.fractures.length
    + ' fracture ' + (c.fracture?.time ?? 0).toFixed(2) + ' cracks ' + (c.fracture?.segments.filter(segment => segment.marked && !segment.burst).length ?? 0);
}
