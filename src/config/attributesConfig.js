export const attributesConfig = {
  "minRating": 1,
  "maxRating": 7,
  "baseRating": 4,
  "multipliers": {
    "1": 0.76,
    "2": 0.84,
    "3": 0.92,
    "4": 1,
    "5": 1.08,
    "6": 1.16,
    "7": 1.24,
    "8": 1.32,
    "9": 1.4,
    "10": 1.48
  },
  "perfectParryBonus": 0.0025,
  "guardBreakStep": 1,
  "precision": 1000000000,
  "legacyScale": {
    "ratingStep": 0.75,
    "flowShift": 1
  },
  "defaults": {
    "health": 4,
    "stamina": 4,
    "blade": 4,
    "defense": 4,
    "agility": 4,
    "flow": 4
  },
  "bases": {
    "guardian": {
      "maxHealth": 97.22222222222221,
      "maxStamina": 100,
      "stamina": {
        "regenPerSecond": 25
      },
      "movement": {
        "walkSpeed": 260,
        "jumpVelocity": 820
      },
      "dodge": {
        "speed": 560
      },
      "parry": {
        "perfectWindow": 0.08
      },
      "guardCostScale": 1.16,
      "guardPushbackScale": 1.16,
      "guardBreakThreshold": 2,
      "evadeWindowScale": 1,
      "abilityMobilityScale": 1,
      "damage": {
        "light": 10,
        "light2": 10,
        "air": 12,
        "forwardHeavy": 24,
        "heavy": 24,
        "riposte": 16,
        "shove": 0,
        "special": 0
      }
    },
    "shadow": {
      "maxHealth": 100,
      "maxStamina": 100,
      "stamina": {
        "regenPerSecond": 25
      },
      "movement": {
        "walkSpeed": 250,
        "jumpVelocity": 800
      },
      "dodge": {
        "speed": 520
      },
      "parry": {
        "perfectWindow": 0.0775
      },
      "guardCostScale": 0.92,
      "guardPushbackScale": 0.92,
      "guardBreakThreshold": -1,
      "evadeWindowScale": 1,
      "abilityMobilityScale": 1,
      "damage": {
        "light": 9.259259259259258,
        "light2": 9.259259259259258,
        "light3": 9.259259259259258,
        "air": 11.11111111111111,
        "forwardHeavy": 20.37037037037037,
        "heavy": 20.37037037037037,
        "riposte": 15.74074074074074,
        "shove": 0,
        "special": 14.814814814814813
      }
    },
    "bastion": {
      "maxHealth": 100,
      "maxStamina": 94.82758620689656,
      "stamina": {
        "regenPerSecond": 20.689655172413794
      },
      "movement": {
        "walkSpeed": 238.0952380952381,
        "jumpVelocity": 833.3333333333334
      },
      "dodge": {
        "speed": 523.8095238095239
      },
      "parry": {
        "perfectWindow": 0.065
      },
      "guardCostScale": 1.24,
      "guardPushbackScale": 1.24,
      "guardBreakThreshold": 3,
      "evadeWindowScale": 1.1904761904761905,
      "abilityMobilityScale": 1.1904761904761905,
      "damage": {
        "light": 8.620689655172413,
        "light2": 8.620689655172413,
        "air": 10.344827586206897,
        "forwardHeavy": 24.137931034482758,
        "heavy": 24.137931034482758,
        "riposte": 15.517241379310343,
        "shove": 0,
        "special": 27.586206896551726
      }
    },
    "wasp": {
      "maxHealth": 102.17391304347825,
      "maxStamina": 86.20689655172414,
      "stamina": {
        "regenPerSecond": 25.86206896551724
      },
      "movement": {
        "walkSpeed": 250,
        "jumpVelocity": 709.6774193548387
      },
      "dodge": {
        "speed": 516.1290322580645
      },
      "parry": {
        "perfectWindow": 0.085
      },
      "guardCostScale": 0.92,
      "guardPushbackScale": 0.92,
      "guardBreakThreshold": -1,
      "evadeWindowScale": 0.8064516129032259,
      "abilityMobilityScale": 0.8064516129032259,
      "damage": {
        "light": 8.333333333333334,
        "light2": 8.333333333333334,
        "light3": 8.333333333333334,
        "light4": 8.333333333333334,
        "light5": 8.333333333333334,
        "air": 14.285714285714286,
        "forwardHeavy": 21.42857142857143,
        "heavy": 21.42857142857143,
        "riposte": 16.666666666666668,
        "shove": 0,
        "special": 8.333333333333334
      }
    },
    "mirror": {
      "maxHealth": 103.26086956521738,
      "maxStamina": 92.5925925925926,
      "stamina": {
        "regenPerSecond": 24.074074074074073
      },
      "movement": {
        "walkSpeed": 260.86956521739125,
        "jumpVelocity": 869.5652173913043
      },
      "dodge": {
        "speed": 608.695652173913
      },
      "parry": {
        "perfectWindow": 0.1
      },
      "guardCostScale": 1.24,
      "guardPushbackScale": 1.24,
      "guardBreakThreshold": 3,
      "evadeWindowScale": 1.0869565217391304,
      "abilityMobilityScale": 1.0869565217391304,
      "damage": {
        "light": 9,
        "light2": 9,
        "air": 12,
        "forwardHeavy": 24,
        "heavy": 24,
        "riposte": 14,
        "shove": 0,
        "special": 0
      }
    },
    "haste": {
      "maxHealth": 96.7741935483871,
      "maxStamina": 100,
      "stamina": {
        "regenPerSecond": 25
      },
      "movement": {
        "walkSpeed": 255.43478260869563,
        "jumpVelocity": 858.695652173913
      },
      "dodge": {
        "speed": 608.695652173913
      },
      "parry": {
        "perfectWindow": 0.08
      },
      "guardCostScale": 1,
      "guardPushbackScale": 1,
      "guardBreakThreshold": 0,
      "evadeWindowScale": 1.0869565217391304,
      "abilityMobilityScale": 1.0869565217391304,
      "damage": {
        "light": 10,
        "light2": 10,
        "air": 12,
        "forwardHeavy": 22,
        "heavy": 22,
        "riposte": 15,
        "shove": 0,
        "special": 24
      }
    },
    "ember": {
      "maxHealth": 103.26086956521738,
      "maxStamina": 92.5925925925926,
      "stamina": {
        "regenPerSecond": 24.074074074074073
      },
      "movement": {
        "walkSpeed": 255,
        "jumpVelocity": 820
      },
      "dodge": {
        "speed": 560
      },
      "parry": {
        "perfectWindow": 0.0775
      },
      "guardCostScale": 1,
      "guardPushbackScale": 1,
      "guardBreakThreshold": 0,
      "evadeWindowScale": 1,
      "abilityMobilityScale": 1,
      "damage": {
        "light": 7.4074074074074066,
        "light2": 7.4074074074074066,
        "light3": 7.4074074074074066,
        "air": 11.11111111111111,
        "forwardHeavy": 21.296296296296298,
        "heavy": 21.296296296296298,
        "riposte": 16.666666666666668,
        "shove": 0,
        "counterStrike": 18.518518518518515,
        "special": 0
      }
    },
    "forge": {
      "maxHealth": 94.82758620689656,
      "maxStamina": 108.69565217391303,
      "stamina": {
        "regenPerSecond": 26.08695652173913
      },
      "movement": {
        "walkSpeed": 244.56521739130434,
        "jumpVelocity": 826.086956521739
      },
      "dodge": {
        "speed": 521.7391304347826
      },
      "parry": {
        "perfectWindow": 0.065
      },
      "guardCostScale": 1.08,
      "guardPushbackScale": 1.08,
      "guardBreakThreshold": 1,
      "evadeWindowScale": 1.0869565217391304,
      "abilityMobilityScale": 1.0869565217391304,
      "damage": {
        "light": 9.482758620689655,
        "light2": 9.482758620689655,
        "air": 10.344827586206897,
        "forwardHeavy": 23.275862068965516,
        "heavy": 23.275862068965516,
        "riposte": 14.655172413793103,
        "shove": 0,
        "special": 18.96551724137931
      }
    },
    "heron": {
      "maxHealth": 97.22222222222221,
      "maxStamina": 86.20689655172414,
      "stamina": {
        "regenPerSecond": 23.27586206896552
      },
      "movement": {
        "walkSpeed": 249.99999999999997,
        "jumpVelocity": 775.8620689655172
      },
      "dodge": {
        "speed": 517.2413793103449
      },
      "parry": {
        "perfectWindow": 0.0825
      },
      "guardCostScale": 0.92,
      "guardPushbackScale": 0.92,
      "guardBreakThreshold": -1,
      "evadeWindowScale": 0.8620689655172414,
      "abilityMobilityScale": 0.8620689655172414,
      "damage": {
        "light": 9.782608695652172,
        "light2": 9.782608695652172,
        "light3": 9.782608695652172,
        "air": 13.043478260869565,
        "airHeavy": 17.391304347826086,
        "forwardHeavy": 21.739130434782606,
        "heavy": 21.739130434782606,
        "riposte": 16.304347826086957,
        "shove": 0,
        "special": 9.782608695652172
      }
    },
    "echo": {
      "maxHealth": 100,
      "maxStamina": 86.20689655172414,
      "stamina": {
        "regenPerSecond": 23.27586206896552
      },
      "movement": {
        "walkSpeed": 232.7586206896552,
        "jumpVelocity": 715.5172413793105
      },
      "dodge": {
        "speed": 482.7586206896552
      },
      "parry": {
        "perfectWindow": 0.0775
      },
      "guardCostScale": 0.92,
      "guardPushbackScale": 0.92,
      "guardBreakThreshold": -1,
      "evadeWindowScale": 0.8620689655172414,
      "abilityMobilityScale": 0.8620689655172414,
      "damage": {
        "light": 9.259259259259258,
        "light2": 9.259259259259258,
        "air": 11.11111111111111,
        "forwardHeavy": 24.074074074074073,
        "heavy": 24.074074074074073,
        "riposte": 14.814814814814813,
        "shove": 0,
        "special": 9.259259259259258
      }
    },
    "shadowAwakened": {
      "maxHealth": 120.96774193548387,
      "maxStamina": 86.20689655172414,
      "stamina": {
        "regenPerSecond": 25.862068965517246
      },
      "movement": {
        "walkSpeed": 250,
        "jumpVelocity": 800
      },
      "dodge": {
        "speed": 520
      },
      "parry": {
        "perfectWindow": 0.075
      },
      "guardCostScale": 1.08,
      "guardPushbackScale": 1.08,
      "guardBreakThreshold": 1,
      "evadeWindowScale": 1,
      "abilityMobilityScale": 1,
      "damage": {
        "light": 8.620689655172413,
        "light2": 8.620689655172413,
        "light3": 8.620689655172413,
        "air": 10.344827586206897,
        "forwardHeavy": 24.137931034482758,
        "heavy": 24.137931034482758,
        "riposte": 14.655172413793103,
        "shove": 0,
        "special": 13.793103448275863
      }
    }
  }
};

export const attributeOrder = Object.freeze(['health', 'stamina', 'blade', 'defense', 'agility', 'flow']);
