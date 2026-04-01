export type PlanetSceneParameters = {
  ambientStrength: number;
  sunColor: string;
  sphere1FogDensity: number;
  sphere1AtmosphereAltitude: number;
  sphere1FalloffPower: number;
  sphere1MultiScatterBoost: number;
  sphere1PhaseG: number;
  sphere1RayleighStrength: number;
  sphere1MieStrength: number;
  sphere1RayleighColor: string;
  sphere1MieColor: string;
  sphere2FogDensity: number;
  sphere2AtmosphereAltitude: number;
  sphere2FalloffPower: number;
  sphere2MultiScatterBoost: number;
  sphere2PhaseG: number;
  sphere2RayleighStrength: number;
  sphere2MieStrength: number;
  sphere2RayleighColor: string;
  sphere2MieColor: string;
};

export const PLANET_SCENE_DEFAULTS: PlanetSceneParameters = {
  ambientStrength: 0.05,
  sunColor: '#ffffff',
  sphere1FogDensity: 3.0,
  sphere1AtmosphereAltitude: 0.3,
  sphere1FalloffPower: 4.0,
  sphere1MultiScatterBoost: 0.3,
  sphere1PhaseG: 0.7,
  sphere1RayleighStrength: 1.0,
  sphere1MieStrength: 0.5,
  sphere1RayleighColor: '#4488ff',
  sphere1MieColor: '#ffddaa',
  sphere2FogDensity: 1.0,
  sphere2AtmosphereAltitude: 0.6,
  sphere2FalloffPower: 2.0,
  sphere2MultiScatterBoost: 0.1,
  sphere2PhaseG: 0.3,
  sphere2RayleighStrength: 0.3,
  sphere2MieStrength: 0.1,
  sphere2RayleighColor: '#aaccff',
  sphere2MieColor: '#ffffff',
};
