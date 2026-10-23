import { describe, expect, it } from 'vitest';
import { FLIGHT } from './flight';
import { PLANET_RADIUS, ROCKET, ROCKET_SCALE } from './shapes';

const ASTRE_RADIUS = PLANET_RADIUS * FLIGHT.astreScale;

describe('the landed rocket', () => {
	it('stands with each foot on the round top of its astre, the right leg further down the slope', () => {
		for (const foot of ROCKET.footBalls) {
			const x = FLIGHT.landingX + foot.x * ROCKET_SCALE;
			const y = FLIGHT.landingY + foot.y * ROCKET_SCALE;
			const fromCenter = Math.hypot(x - FLIGHT.destinationX, y - FLIGHT.astreY);
			const radius = foot.radius * ROCKET_SCALE;

			expect(fromCenter).toBeGreaterThan(ASTRE_RADIUS - radius);
			expect(fromCenter).toBeLessThan(ASTRE_RADIUS + radius);
		}
	});
});
