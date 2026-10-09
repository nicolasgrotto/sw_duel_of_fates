export const attributesConfig = {
  "minRating": 1,
  "maxRating": 9,
  "ratingLimits": {
    "flow": 8
  },
  "baseRating": 5,
  "multipliers": {
    "1": 0.76,
    "2": 0.82,
    "3": 0.88,
    "4": 0.94,
    "5": 1.0,
    "6": 1.06,
    "7": 1.12,
    "8": 1.18,
    "9": 1.24,
    "10": 1.3,
    "11": 1.36,
    "12": 1.42
  },
  "perfectParryBonus": 0.002,
  "guardBreakStep": 1,
  "precision": 1000000000.0,
  "defaults": {
    "health": 5,
    "stamina": 5,
    "blade": 5,
    "defense": 5,
    "agility": 5,
    "flow": 5
  },
  "bases": {
    "guardian": {
      "maxHealth": 99.0566037735849,
      "maxStamina": 100.0,
      "stamina": {
        "regenPerSecond": 25.0
      },
      "movement": {
        "walkSpeed": 260.0,
        "jumpVelocity": 820.0
      },
      "dodge": {
        "speed": 560.0
      },
      "parry": {
        "perfectWindow": 0.08
      },
      "guardCostScale": 1.18,
      "guardPushbackScale": 1.18,
      "guardBreakThreshold": 3,
      "evadeWindowScale": 1.0,
      "abilityMobilityScale": 1.0,
      "damage": {
        "light": 10.0,
        "light2": 10.0,
        "air": 12.0,
        "forwardHeavy": 24.0,
        "heavy": 24.0,
        "riposte": 16.0,
        "shove": 0.0,
        "special": 0.0
      }
    },
    "shadow": {
      "maxHealth": 100.0,
      "maxStamina": 100.0,
      "stamina": {
        "regenPerSecond": 25.0
      },
      "movement": {
        "walkSpeed": 250.0,
        "jumpVelocity": 800.0
      },
      "dodge": {
        "speed": 520.0
      },
      "parry": {
        "perfectWindow": 0.078
      },
      "guardCostScale": 0.94,
      "guardPushbackScale": 0.94,
      "guardBreakThreshold": -1,
      "evadeWindowScale": 1.0,
      "abilityMobilityScale": 1.0,
      "damage": {
        "light": 9.433962264150942,
        "light2": 9.433962264150942,
        "light3": 9.433962264150942,
        "air": 11.320754716981131,
        "forwardHeavy": 20.754716981132074,
        "heavy": 20.754716981132074,
        "riposte": 16.037735849056602,
        "shove": 0.0,
        "special": 15.094339622641508
      }
    },
    "bastion": {
      "maxHealth": 98.30508474576271,
      "maxStamina": 98.21428571428571,
      "stamina": {
        "regenPerSecond": 21.428571428571427
      },
      "movement": {
        "walkSpeed": 243.90243902439025,
        "jumpVelocity": 853.6585365853659
      },
      "dodge": {
        "speed": 536.5853658536586
      },
      "parry": {
        "perfectWindow": 0.064
      },
      "guardCostScale": 1.24,
      "guardPushbackScale": 1.24,
      "guardBreakThreshold": 4,
      "evadeWindowScale": 1.2195121951219512,
      "abilityMobilityScale": 1.2195121951219512,
      "damage": {
        "light": 8.474576271186441,
        "light2": 8.474576271186441,
        "air": 10.16949152542373,
        "forwardHeavy": 23.728813559322035,
        "heavy": 23.728813559322035,
        "riposte": 15.254237288135593,
        "shove": 0.0,
        "special": 27.118644067796613
      }
    },
    "wasp": {
      "maxHealth": 106.81818181818181,
      "maxStamina": 84.74576271186442,
      "stamina": {
        "regenPerSecond": 25.423728813559322
      },
      "movement": {
        "walkSpeed": 250.0,
        "jumpVelocity": 709.6774193548387
      },
      "dodge": {
        "speed": 516.1290322580645
      },
      "parry": {
        "perfectWindow": 0.08600000000000001
      },
      "guardCostScale": 0.88,
      "guardPushbackScale": 0.88,
      "guardBreakThreshold": -2,
      "evadeWindowScale": 0.8064516129032259,
      "abilityMobilityScale": 0.8064516129032259,
      "damage": {
        "light": 8.536585365853659,
        "light2": 8.536585365853659,
        "light3": 8.536585365853659,
        "light4": 8.536585365853659,
        "light5": 8.536585365853659,
        "air": 14.634146341463415,
        "forwardHeavy": 21.951219512195124,
        "heavy": 21.951219512195124,
        "riposte": 17.073170731707318,
        "shove": 0.0,
        "special": 8.536585365853659
      }
    },
    "mirror": {
      "maxHealth": 107.95454545454545,
      "maxStamina": 94.33962264150944,
      "stamina": {
        "regenPerSecond": 24.528301886792452
      },
      "movement": {
        "walkSpeed": 255.31914893617022,
        "jumpVelocity": 851.0638297872341
      },
      "dodge": {
        "speed": 595.7446808510639
      },
      "parry": {
        "perfectWindow": 0.1
      },
      "guardCostScale": 1.24,
      "guardPushbackScale": 1.24,
      "guardBreakThreshold": 4,
      "evadeWindowScale": 1.0638297872340425,
      "abilityMobilityScale": 1.0638297872340425,
      "damage": {
        "light": 9.0,
        "light2": 9.0,
        "air": 12.0,
        "forwardHeavy": 24.0,
        "heavy": 24.0,
        "riposte": 14.0,
        "shove": 0.0,
        "special": 0.0
      }
    },
    "haste": {
      "maxHealth": 96.7741935483871,
      "maxStamina": 100.0,
      "stamina": {
        "regenPerSecond": 25.0
      },
      "movement": {
        "walkSpeed": 250.0,
        "jumpVelocity": 840.4255319148937
      },
      "dodge": {
        "speed": 595.7446808510639
      },
      "parry": {
        "perfectWindow": 0.08
      },
      "guardCostScale": 1.0,
      "guardPushbackScale": 1.0,
      "guardBreakThreshold": 0,
      "evadeWindowScale": 1.0638297872340425,
      "abilityMobilityScale": 1.0638297872340425,
      "damage": {
        "light": 10.0,
        "light2": 10.0,
        "air": 12.0,
        "forwardHeavy": 22.0,
        "heavy": 22.0,
        "riposte": 15.0,
        "shove": 0.0,
        "special": 24.0
      }
    },
    "ember": {
      "maxHealth": 107.95454545454545,
      "maxStamina": 94.33962264150944,
      "stamina": {
        "regenPerSecond": 24.528301886792452
      },
      "movement": {
        "walkSpeed": 255.0,
        "jumpVelocity": 820.0
      },
      "dodge": {
        "speed": 560.0
      },
      "parry": {
        "perfectWindow": 0.078
      },
      "guardCostScale": 1.0,
      "guardPushbackScale": 1.0,
      "guardBreakThreshold": 0,
      "evadeWindowScale": 1.0,
      "abilityMobilityScale": 1.0,
      "damage": {
        "light": 7.547169811320754,
        "light2": 7.547169811320754,
        "light3": 7.547169811320754,
        "air": 11.320754716981131,
        "forwardHeavy": 21.69811320754717,
        "heavy": 21.69811320754717,
        "riposte": 16.9811320754717,
        "shove": 0.0,
        "counterStrike": 18.867924528301884,
        "special": 0.0
      }
    },
    "forge": {
      "maxHealth": 98.21428571428571,
      "maxStamina": 106.38297872340426,
      "stamina": {
        "regenPerSecond": 25.531914893617024
      },
      "movement": {
        "walkSpeed": 255.6818181818182,
        "jumpVelocity": 863.6363636363636
      },
      "dodge": {
        "speed": 545.4545454545455
      },
      "parry": {
        "perfectWindow": 0.064
      },
      "guardCostScale": 1.06,
      "guardPushbackScale": 1.06,
      "guardBreakThreshold": 1,
      "evadeWindowScale": 1.1363636363636365,
      "abilityMobilityScale": 1.1363636363636365,
      "damage": {
        "light": 9.322033898305085,
        "light2": 9.322033898305085,
        "air": 10.16949152542373,
        "forwardHeavy": 22.88135593220339,
        "heavy": 22.88135593220339,
        "riposte": 14.40677966101695,
        "shove": 0.0,
        "special": 18.64406779661017
      }
    },
    "heron": {
      "maxHealth": 99.0566037735849,
      "maxStamina": 89.28571428571428,
      "stamina": {
        "regenPerSecond": 24.107142857142854
      },
      "movement": {
        "walkSpeed": 245.76271186440678,
        "jumpVelocity": 762.7118644067797
      },
      "dodge": {
        "speed": 508.4745762711865
      },
      "parry": {
        "perfectWindow": 0.084
      },
      "guardCostScale": 0.88,
      "guardPushbackScale": 0.88,
      "guardBreakThreshold": -2,
      "evadeWindowScale": 0.8474576271186441,
      "abilityMobilityScale": 0.8474576271186441,
      "damage": {
        "light": 10.227272727272727,
        "light2": 10.227272727272727,
        "light3": 10.227272727272727,
        "air": 13.636363636363637,
        "airHeavy": 18.181818181818183,
        "forwardHeavy": 22.727272727272727,
        "heavy": 22.727272727272727,
        "riposte": 17.045454545454547,
        "shove": 0.0,
        "special": 10.227272727272727
      }
    },
    "echo": {
      "maxHealth": 98.30508474576271,
      "maxStamina": 89.28571428571428,
      "stamina": {
        "regenPerSecond": 24.107142857142854
      },
      "movement": {
        "walkSpeed": 241.07142857142856,
        "jumpVelocity": 741.0714285714286
      },
      "dodge": {
        "speed": 499.99999999999994
      },
      "parry": {
        "perfectWindow": 0.078
      },
      "guardCostScale": 0.94,
      "guardPushbackScale": 0.94,
      "guardBreakThreshold": -1,
      "evadeWindowScale": 0.8928571428571428,
      "abilityMobilityScale": 0.8928571428571428,
      "damage": {
        "light": 9.433962264150942,
        "light2": 9.433962264150942,
        "air": 11.320754716981131,
        "forwardHeavy": 24.528301886792452,
        "heavy": 24.528301886792452,
        "riposte": 15.094339622641508,
        "shove": 0.0,
        "special": 9.433962264150942
      }
    },
    "shadowAwakened": {
      "maxHealth": 120.96774193548387,
      "maxStamina": 89.28571428571428,
      "stamina": {
        "regenPerSecond": 26.785714285714285
      },
      "movement": {
        "walkSpeed": 250.0,
        "jumpVelocity": 800.0
      },
      "dodge": {
        "speed": 520.0
      },
      "parry": {
        "perfectWindow": 0.074
      },
      "guardCostScale": 1.06,
      "guardPushbackScale": 1.06,
      "guardBreakThreshold": 1,
      "evadeWindowScale": 1.0,
      "abilityMobilityScale": 1.0,
      "damage": {
        "light": 8.474576271186441,
        "light2": 8.474576271186441,
        "light3": 8.474576271186441,
        "air": 10.16949152542373,
        "forwardHeavy": 23.728813559322035,
        "heavy": 23.728813559322035,
        "riposte": 14.40677966101695,
        "shove": 0.0,
        "special": 13.559322033898306
      }
    }
  }
};

export const attributeOrder = Object.freeze(['health', 'stamina', 'blade', 'defense', 'agility', 'flow']);
