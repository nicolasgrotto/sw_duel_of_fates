export function getPowerDebugInfo(fighter) {
  const c = fighter.combat;
  return fighter.id + ' mode ' + (c.powerMode ?? '-') + ' choke ' + c.chokeTime.toFixed(2)
    + ' sanctuary ' + c.sanctuaryShield.toFixed(1) + '/' + c.sanctuaryTime.toFixed(2) + ' wrath armor ' + c.wrathArmorHits
    + ' rain ' + (c.rain?.phase ?? '-') + '/' + (c.rain?.time ?? 0).toFixed(2) + ' marks ' + (c.rain?.marks.filter(mark => mark.active).length ?? 0)
    + ' fracture ' + (c.fracture?.time ?? 0).toFixed(2) + ' cracks ' + (c.fracture?.segments.filter(segment => segment.marked && !segment.burst).length ?? 0);
}
